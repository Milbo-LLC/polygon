import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  CreateOperationSchema,
  UpdateOperationSchema,
  BatchOperationsSchema,
  GetOperationsByDocumentSchema,
  GetOperationByIdSchema,
  DeleteOperationSchema,
  validateOperationParameters,
} from "~/validators/operations";

export const operationsRouter = createTRPCRouter({
  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Get all operations for a document (ordered by sequence)
   */
  getByDocument: protectedProcedure
    .input(GetOperationsByDocumentSchema)
    .query(async ({ ctx, input }) => {
      // Verify user has access to this document
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check user is member of organization
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Return operations in sequence order
      return ctx.db.documentOperation.findMany({
        where: {
          documentId: input.documentId,
          deletedAt: null,
        },
        orderBy: { sequence: "asc" },
      });
    }),

  /**
   * Get single operation by ID
   */
  getById: protectedProcedure
    .input(GetOperationByIdSchema)
    .query(async ({ ctx, input }) => {
      const operation = await ctx.db.documentOperation.findUnique({
        where: { id: input.operationId },
        include: {
          document: {
            include: {
              project: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      // Check user has access
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: operation.document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      return operation;
    }),

  // ============================================================================
  // MUTATION OPERATIONS
  // ============================================================================

  /**
   * Create a single operation
   */
  create: protectedProcedure
    .input(CreateOperationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to document
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check user is member of organization
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Validate operation parameters based on type
      try {
        validateOperationParameters(input.type, input.parameters);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid parameters",
        });
      }

      // Get next sequence number
      const lastOp = await ctx.db.documentOperation.findFirst({
        where: { documentId: input.documentId },
        orderBy: { sequence: "desc" },
      });

      const nextSequence = (lastOp?.sequence ?? -1) + 1;

      // Create operation
      const operation = await ctx.db.documentOperation.create({
        data: {
          documentId: input.documentId,
          type: input.type,
          parameters: input.parameters,
          dependencies: input.dependencies,
          sequence: nextSequence,
          createdBy: ctx.session.user.id,
        },
      });

      // Invalidate geometry cache for this document
      await ctx.db.computedGeometry.updateMany({
        where: { documentId: input.documentId },
        data: { isValid: false },
      });

      return operation;
    }),

  /**
   * Create multiple operations atomically
   */
  createBatch: protectedProcedure
    .input(BatchOperationsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to document
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check user is member of organization
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Validate all operations first
      for (const op of input.operations) {
        try {
          validateOperationParameters(op.type, op.parameters);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid parameters for operation type ${op.type}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      }

      // Get next sequence number
      const lastOp = await ctx.db.documentOperation.findFirst({
        where: { documentId: input.documentId },
        orderBy: { sequence: "desc" },
      });

      let nextSequence = (lastOp?.sequence ?? -1) + 1;

      // Use transaction for atomicity
      const operations = await ctx.db.$transaction(
        input.operations.map((op) =>
          ctx.db.documentOperation.create({
            data: {
              documentId: input.documentId,
              type: op.type,
              parameters: op.parameters,
              dependencies: op.dependencies,
              sequence: nextSequence++,
              createdBy: ctx.session.user.id,
            },
          }),
        ),
      );

      // Invalidate geometry cache
      await ctx.db.computedGeometry.updateMany({
        where: { documentId: input.documentId },
        data: { isValid: false },
      });

      return operations;
    }),

  /**
   * Update operation parameters (triggers recompute)
   */
  update: protectedProcedure
    .input(UpdateOperationSchema)
    .mutation(async ({ ctx, input }) => {
      const operation = await ctx.db.documentOperation.findUnique({
        where: { id: input.operationId },
        include: {
          document: {
            include: {
              project: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      // Check user has access and is owner/admin
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: operation.document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Only owner/admin can update operations
      if (userOrg.role !== "owner" && userOrg.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update operations",
        });
      }

      // Merge and validate updated parameters
      const updatedParameters = {
        ...(operation.parameters as object),
        ...(input.parameters ?? {}),
      };

      try {
        validateOperationParameters(operation.type, updatedParameters);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid parameters",
        });
      }

      // Update operation
      const updated = await ctx.db.documentOperation.update({
        where: { id: input.operationId },
        data: {
          parameters: updatedParameters,
          updatedAt: new Date(),
        },
      });

      // Invalidate geometry cache for affected operations
      // (This operation and all dependent operations)
      await ctx.db.computedGeometry.updateMany({
        where: { documentId: operation.documentId },
        data: { isValid: false },
      });

      return updated;
    }),

  /**
   * Delete operation (soft delete)
   */
  delete: protectedProcedure
    .input(DeleteOperationSchema)
    .mutation(async ({ ctx, input }) => {
      const operation = await ctx.db.documentOperation.findUnique({
        where: { id: input.operationId },
        include: {
          document: {
            include: {
              project: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Operation not found",
        });
      }

      // Check user has access and is owner/admin
      const userOrg = await ctx.db.userOrganization.findUnique({
        where: {
          id: {
            userId: ctx.session.user.id,
            organizationId: operation.document.project.organizationId,
          },
          deletedAt: null,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      // Only owner/admin can delete operations
      if (userOrg.role !== "owner" && userOrg.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete operations",
        });
      }

      // Check if any operations depend on this one
      const dependentOps = await ctx.db.documentOperation.findMany({
        where: {
          documentId: operation.documentId,
          dependencies: { has: input.operationId },
          deletedAt: null,
        },
      });

      if (dependentOps.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete operation: ${dependentOps.length} operation(s) depend on it`,
        });
      }

      // Soft delete
      const deleted = await ctx.db.documentOperation.update({
        where: { id: input.operationId },
        data: { deletedAt: new Date() },
      });

      // Invalidate geometry cache
      await ctx.db.computedGeometry.updateMany({
        where: { documentId: operation.documentId },
        data: { isValid: false },
      });

      return deleted;
    }),
});
