import { z } from "zod";
import { type Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateProjectSchema, ProjectSchema, UpdateProjectSchema } from "~/validators/projects";
import { parseDocument } from "./documents";
import type { Project } from "~/validators/projects";

type ProjectWithDocuments = Prisma.ProjectGetPayload<{
  include: { documents: true };
}>;

export const parseProject = (dbProject: ProjectWithDocuments): Project => ({
  ...dbProject,
  documents: dbProject.documents.map(parseDocument)
});

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .output(ProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizations[0]?.id;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      // Create project and first document in a transaction
      const project = await ctx.db.$transaction(async (tx) => {
        // Create the project first
        const newProject = await tx.project.create({
          data: {
            name: input.name,
            description: input.description,
            organizationId,
            userId: ctx.session.user.id,
          },
        });
        
        // Create the first document for this project
        await tx.document.create({
          data: {
            name: "Untitled Document",
            state: {},
            projectId: newProject.id,
          },
        });
        
        // Return the project with documents included
        return tx.project.findUniqueOrThrow({
          where: { id: newProject.id },
          include: { documents: true },
        });
      });

      return parseProject(project);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(ProjectSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const project = await ctx.db.project.findUnique({
        where: { id, deletedAt: null },
        include: {
          documents: true,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      return parseProject(project);
    }),

  getAll: protectedProcedure
    .output(z.array(ProjectSchema))
    .query(async ({ ctx }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          deletedAt: null
        },
        include: { documents: true },
      });
      
      return projects.map(project => parseProject(project));
    }),

  // Soft delete
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.boolean())
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      await ctx.db.project.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      return true;
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .output(ProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, description } = input;

      const project = await ctx.db.project.update({
        where: { id },
        data: {
          name,
          description,
        },
        include: {
          documents: true,
        },
      });

      return parseProject(project);
    }),
  
  addDocument: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      documentId: z.string(),
    }))
    .output(ProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, documentId } = input;
      const project = await ctx.db.project.update({
        where: { id: projectId },
        data: {
          documents: { connect: { id: documentId } },
        },
        include: {
          documents: true,
        },
      });

      return parseProject(project);
    }),
});
