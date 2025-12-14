import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ExportDocumentSchema } from "~/validators/operations";

/**
 * Export router for CAD model exports (STL, STEP, JSON, 3MF)
 *
 * Implementation status:
 * - JSON: ✅ Fully implemented
 * - STL: 🚧 Placeholder (Week 4)
 * - STEP: 🚧 Placeholder (Week 6)
 * - 3MF: 🚧 Future implementation
 */
export const exportRouter = createTRPCRouter({
  /**
   * Export document to specified format
   */
  export: protectedProcedure
    .input(ExportDocumentSchema)
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

      // Get all operations for document
      const operations = await ctx.db.documentOperation.findMany({
        where: {
          documentId: input.documentId,
          deletedAt: null,
        },
        orderBy: { sequence: "asc" },
      });

      // Export based on format
      switch (input.format) {
        case "json":
          return exportToJSON(document, operations, input.options);

        case "stl":
          // TODO: Week 4 implementation
          throw new TRPCError({
            code: "NOT_IMPLEMENTED",
            message:
              "STL export will be implemented in Phase 2 Week 4. See MIL-131",
          });

        case "step":
          // TODO: Week 6 implementation
          throw new TRPCError({
            code: "NOT_IMPLEMENTED",
            message:
              "STEP export will be implemented in Phase 2 Week 6. See MIL-133",
          });

        case "3mf":
          // TODO: Future implementation
          throw new TRPCError({
            code: "NOT_IMPLEMENTED",
            message:
              "3MF export is planned for a future phase. Use STL for now.",
          });

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unknown export format: ${input.format}`,
          });
      }
    }),
});

/**
 * Export to native JSON format
 * Preserves full operation history and parameters
 */
function exportToJSON(
  document: { id: string; name: string; createdAt: Date; updatedAt: Date },
  operations: Array<{
    id: string;
    type: string;
    sequence: number;
    parameters: unknown;
    dependencies: string[];
    createdAt: Date;
  }>,
  options?: {
    includeMetadata?: boolean;
  },
) {
  const exportData = {
    version: "1.0.0",
    format: "polygon-native",
    metadata: options?.includeMetadata
      ? {
          documentId: document.id,
          name: document.name,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          exportedAt: new Date().toISOString(),
        }
      : undefined,
    operations: operations.map((op) => ({
      id: op.id,
      type: op.type,
      sequence: op.sequence,
      parameters: op.parameters,
      dependencies: op.dependencies,
      createdAt: op.createdAt.toISOString(),
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  return {
    filename: `${document.name}.polygon.json`,
    mimeType: "application/json",
    data: Buffer.from(jsonString).toString("base64"),
  };
}
