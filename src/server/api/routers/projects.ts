import { z } from "zod";
import { type Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateProjectSchema, ProjectSchema, UpdateProjectSchema, ProjectWithDocumentsSchema } from "~/validators/projects";
import { parseDocument } from "./documents";
import { DocumentSchema, type Document } from "~/validators/documents";

type ProjectWithDocuments = Prisma.ProjectGetPayload<{
  include: { documents: true };
}>;

// Define a type that includes Document[] for documents instead of what the database returns
type ParsedProjectWithDocuments = Omit<ProjectWithDocuments, "documents"> & {
  documents: Document[];
};

// Define a Zod schema for the parsed project with documents
const ZodProjectWithDocumentsSchema = ProjectSchema.extend({
  documents: z.array(DocumentSchema),
});

export const parseProject = (dbProject: ProjectWithDocuments): ParsedProjectWithDocuments => ({
  ...dbProject,
  documents: dbProject.documents.map(parseDocument)
} as ParsedProjectWithDocuments);

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .output(ProjectWithDocumentsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.organizationId) {
        throw new Error("No active organization");
      }

      // Create project and first document in a transaction
      const project = await ctx.db.$transaction(async (tx) => {
        // Create the project first
        const newProject = await tx.project.create({
          data: {
            name: input.name,
            description: input.description,
            organizationId: ctx.organizationId!,
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
    .output(ZodProjectWithDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const project = await ctx.db.project.findUnique({
        where: { id, userId: ctx.session.user.id, deletedAt: null },
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
    .output(z.array(ProjectWithDocumentsSchema))
    .query(async ({ ctx }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          organizationId: ctx.organizationId,
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
      
      // First, find the project to check ownership and organization
      const project = await ctx.db.project.findUnique({
        where: { id, deletedAt: null },
        select: { userId: true, organizationId: true }
      });
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Get the user's role in this organization
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: project.organizationId,
          deletedAt: null
        }
      });
      
      if (!userOrg) {
        throw new Error("You don't have access to this organization");
      }
      
      // Check permissions:
      // 1. Owner or Admin can delete any project
      // 2. Members can only delete their own projects
      const isOwnerOrAdmin = userOrg.role === 'owner' || userOrg.role === 'admin';
      const isProjectCreator = project.userId === ctx.session.user.id;
      
      if (!isOwnerOrAdmin && !isProjectCreator) {
        throw new Error("You don't have permission to delete this project");
      }
      
      // Proceed with deletion if authorized
      await ctx.db.project.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      return true;
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .output(ProjectWithDocumentsSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, description } = input;

      const project = await ctx.db.project.update({
        where: { id, userId: ctx.session.user.id },
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
    .output(ProjectWithDocumentsSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, documentId } = input;
      const project = await ctx.db.project.update({
        where: { id: projectId, userId: ctx.session.user.id },
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
