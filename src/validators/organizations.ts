import { z } from "zod";
// Import type only
import type { Project } from "./projects";

// Base schema without nested fields
export const OrganizationBaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  name: z.string(),
  logoUrl: z.string().nullable(),
});

export type OrganizationBase = z.infer<typeof OrganizationBaseSchema>;

// For backward compatibility
export const OrganizationSchema = OrganizationBaseSchema;
export type Organization = OrganizationBase;



