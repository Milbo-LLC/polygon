import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"
import { TRPCError } from "@trpc/server"
import type { HistoryEntry, DocumentState } from "~/types/history"

export const historyRouter = createTRPCRouter({
  // Get history entries for a document
  getHistory: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      from: z.number().optional(),
      to: z.number().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.historyEntry.findMany({
        where: {
          documentId: input.documentId,
          version: {
            gte: input.from,
            lte: input.to,
          },
        },
        orderBy: { version: 'desc' },
        take: input.limit,
      })

      return entries.map(entry => ({
        ...entry,
        action: entry.parameters as any, // Parse JSON
      }))
    }),

  // Save history entries (batch)
  saveEntries: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      entries: z.array(z.object({
        version: z.number(),
        actionType: z.string(),
        actionSubtype: z.string(),
        targetId: z.string().optional(),
        parentEntryId: z.string().optional(),
        parameters: z.any(),
        metadata: z.any().optional(),
        isCheckpoint: z.boolean().optional(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      // Batch create history entries
      const createdEntries = await ctx.db.historyEntry.createMany({
        data: input.entries.map((entry: any) => ({
          documentId: input.documentId,
          userId: ctx.session.user.id,
          version: entry.version,
          actionType: entry.actionType,
          actionSubtype: entry.actionSubtype,
          targetId: entry.targetId,
          parentEntryId: entry.parentEntryId,
          parameters: entry.parameters,
          metadata: entry.metadata,
          isCheckpoint: entry.isCheckpoint || false,
        })),
      })

      // Update document version
      await ctx.db.document.update({
        where: { id: input.documentId },
        data: { 
          version: input.entries[input.entries.length - 1]!.version 
        },
      })

      return { count: createdEntries.count }
    }),

  // Get checkpoint
  getCheckpoint: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      version: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const checkpoint = await ctx.db.documentState.findUnique({
        where: {
          documentId_version: {
            documentId: input.documentId,
            version: input.version,
          },
        },
      })

      if (!checkpoint) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Checkpoint not found',
        })
      }

      return {
        version: checkpoint.version,
        state: checkpoint.state as unknown as DocumentState,
        createdAt: checkpoint.createdAt,
      }
    }),

  // Save checkpoint
  saveCheckpoint: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      version: z.number(),
      state: z.record(z.any()),
      stateHash: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify document access
      const document = await ctx.db.document.findFirst({
        where: {
          id: input.documentId,
          project: {
            userId: ctx.session.user.id,
          },
        },
      })

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found or access denied',
        })
      }

      const checkpoint = await ctx.db.documentState.upsert({
        where: {
          documentId_version: {
            documentId: input.documentId,
            version: input.version,
          },
        },
        create: {
          documentId: input.documentId,
          version: input.version,
          state: input.state,
          stateHash: input.stateHash,
          isCheckpoint: true,
        },
        update: {
          state: input.state,
          stateHash: input.stateHash,
        },
      })

      return checkpoint
    }),

  // Get latest state
  getLatestState: protectedProcedure
    .input(z.object({
      documentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // First try to get from document
      const document = await ctx.db.document.findFirst({
        where: {
          id: input.documentId,
          project: {
            userId: ctx.session.user.id,
          },
        },
      })

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found or access denied',
        })
      }

      // If document has state, return it
      if (document.state && Object.keys(document.state as object).length > 0) {
        return {
          version: document.version,
          state: document.state as unknown as DocumentState,
        }
      }

      // Otherwise, look for the latest checkpoint
      const latestCheckpoint = await ctx.db.documentState.findFirst({
        where: { documentId: input.documentId },
        orderBy: { version: 'desc' },
      })

      if (latestCheckpoint) {
        return {
          version: latestCheckpoint.version,
          state: latestCheckpoint.state as unknown as DocumentState,
          isCheckpoint: true,
        }
      }

      // Return empty state
      return {
        version: 0,
        state: {
          version: 0,
          sketches: {},
          objects: {},
          materials: {},
          settings: {},
          metadata: {
            lastModified: Date.now(),
            lastModifiedBy: ctx.session.user.id,
          },
        } as DocumentState,
        isCheckpoint: false,
      }
    }),

  // Create branch
  createBranch: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      name: z.string(),
      baseVersion: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const branch = await ctx.db.documentBranch.create({
        data: {
          documentId: input.documentId,
          name: input.name,
          baseVersion: input.baseVersion,
          headVersion: input.baseVersion,
          status: 'active',
        },
      })

      return branch
    }),

  // Get branches
  getBranches: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      status: z.enum(['active', 'merged', 'abandoned']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const branches = await ctx.db.documentBranch.findMany({
        where: {
          documentId: input.documentId,
          status: input.status,
        },
        orderBy: { createdAt: 'desc' },
      })

      return branches
    }),

  loadHistory: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      from: z.number().optional(),
      to: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.historyEntry.findMany({
        where: {
          documentId: input.documentId,
          ...(input.from !== undefined && input.to !== undefined ? {
            version: {
              gte: input.from,
              lte: input.to,
            }
          } : {}),
        },
        orderBy: { version: 'desc' },
        take: input.limit,
      })

      return entries
    }),

  getCheckpoints: protectedProcedure
    .input(z.object({
      documentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const checkpoints = await ctx.db.documentState.findMany({
        where: {
          documentId: input.documentId,
          isCheckpoint: true,
        },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          createdAt: true,
          stateHash: true,
        }
      })

      return checkpoints.map(checkpoint => {
        return {
          id: checkpoint.id,
          version: checkpoint.version,
          createdAt: checkpoint.createdAt,
          stateHash: checkpoint.stateHash,
        }
      })
    }),
}) 