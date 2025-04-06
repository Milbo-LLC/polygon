import { z } from "zod";
import { UserOrganizationSchema } from "./user-organizations";

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

export const CreateOrganizationSchema = OrganizationBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const UpdateOrganizationSchema = OrganizationBaseSchema.omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).partial();

export const OrganizationWithUserOrganizationsSchema = OrganizationBaseSchema.extend({
  userOrganizations: z.array(UserOrganizationSchema),
});


export type OrganizationWithUserOrganizations = z.infer<typeof OrganizationWithUserOrganizationsSchema>;