import { z } from "zod";
// Import type only
import type { Document } from "./documents";

// Base schema without nested fields
export const ProjectBaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.string(),
  userId: z.string(),
});

export type ProjectBase = z.infer<typeof ProjectBaseSchema>;

// For backward compatibility
export const ProjectSchema = ProjectBaseSchema;
export type Project = ProjectBase;

export const CreateProjectSchema = ProjectSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  organizationId: true, 
  userId: true,
});

export const UpdateProjectSchema = ProjectSchema.omit({
  createdAt: true,
  updatedAt: true,
  organizationId: true,
  userId: true,
}).partial();



