import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateDocumentSchema, DocumentSchema, UpdateDocumentSchema } from "~/validators/documents";

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
        },
      });

      return document;
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

      return document;
    }),

  getAll: protectedProcedure
    .output(z.array(DocumentSchema))
    .query(async ({ ctx }) => {
      const documents = await ctx.db.document.findMany();
      return documents;
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
      const { id, name, state } = input;

      const document = await ctx.db.document.update({
        where: { id },
        data: {
          name,
          state
        },
      });

      return document;
    }),
});
