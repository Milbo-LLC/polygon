import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateDocumentSchema, DocumentSchema, DocumentStateSchema, UpdateDocumentSchema, emptyDocumentState } from "~/validators/documents";
import type { Document } from "~/validators/documents";

// Helper function to parse document state
export const parseDocument = (dbDocument: Prisma.DocumentGetPayload<object>): Document => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt, ...documentWithoutDeletedAt } = dbDocument;
  
  return {
    ...documentWithoutDeletedAt,
    state: DocumentStateSchema.parse(dbDocument.state ?? emptyDocumentState()),
  };
};

export const documentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateDocumentSchema)
    .output(DocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.organizationId as string | null;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const document = await ctx.db.document.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          state: emptyDocumentState(),
        },
      });

      return parseDocument(document);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(DocumentSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const document = await ctx.db.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      return parseDocument(document);
    }),

  getAll: protectedProcedure
    .output(z.array(DocumentSchema))
    .query(async ({ ctx }) => {
      const documents = await ctx.db.document.findMany();
      return documents.map(parseDocument);
    }),

  // Soft delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.boolean())
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      
      // First, find the document and its associated project
      const document = await ctx.db.document.findUnique({
        where: { id, deletedAt: null },
        include: { project: true }
      });
      
      if (!document) {
        throw new Error("Document not found");
      }
      
      // Get the user's role in this organization
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: document.project.organizationId,
          deletedAt: null
        }
      });
      
      if (!userOrg) {
        throw new Error("You don't have access to this organization");
      }
      
      // Check permissions:
      // 1. Owner or Admin can delete any document
      // 2. Members can only delete documents from projects they created
      const isOwnerOrAdmin = userOrg.role === 'owner' || userOrg.role === 'admin';
      const isProjectCreator = document.project.userId === ctx.session.user.id;
      
      if (!isOwnerOrAdmin && !isProjectCreator) {
        throw new Error("You don't have permission to delete this document");
      }
      
      // Proceed with deletion if authorized
      await ctx.db.document.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      return true;
    }),

  update: protectedProcedure
    .input(UpdateDocumentSchema)
    .output(DocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const validatedState = input.state ? DocumentStateSchema.parse(input.state) : undefined;

      const document = await ctx.db.document.update({
        where: { id: input.id },
        data: {
          name: input.name,
          state: validatedState,
        },
      });

      return parseDocument(document);
    }),
});
