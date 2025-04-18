import { type Prisma } from "@prisma/client";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateDocumentSchema, DocumentSchema, DocumentStateSchema, UpdateDocumentSchema } from "~/validators/documents";
import type { Document } from "~/validators/documents";

// Helper function to parse document state
export const parseDocument = (dbDocument: Prisma.DocumentGetPayload<object>): Document => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt, ...documentWithoutDeletedAt } = dbDocument;
  
  return {
    ...documentWithoutDeletedAt,
    state: DocumentStateSchema.parse(dbDocument.state ?? { actions: [] }),
  };
};

export const documentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateDocumentSchema)
    .output(DocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizations[0]?.id;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const document = await ctx.db.document.create({
        data: {
          name: input.name,
          projectId: input.projectId,
          state: {
            actions: [],
          },
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
