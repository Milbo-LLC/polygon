import { z } from "zod";

export const MemberRoleEnum = z.enum(["owner", "admin", "member"]);

export type MemberRole = z.infer<typeof MemberRoleEnum>;

// Base schema without nested fields
export const UserOrganizationBaseSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  userId: z.string(),
  organizationId: z.string(),
  role: MemberRoleEnum,
});

export type UserOrganizationBase = z.infer<typeof UserOrganizationBaseSchema>;

// We'll define the extended schema after importing OrganizationSchema
// This will be done in a separate file to avoid circular imports

// For backward compatibility
export const UserOrganizationSchema = UserOrganizationBaseSchema;
export type UserOrganization = UserOrganizationBase;

export const UpdateUserOrganizationSchema = UserOrganizationBaseSchema.omit({
  createdAt: true,
  updatedAt: true,
}).partial();

export type UpdateUserOrganization = z.infer<typeof UpdateUserOrganizationSchema>;
