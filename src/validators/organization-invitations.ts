import { z } from "zod";

export const OrganizationInvitationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  organizationId: z.string(),
  invitedByUserId: z.string(),
  email: z.string(),
  role: z.string(),
});
export type OrganizationInvitation = z.infer<typeof OrganizationInvitationSchema>;


export const CreateOrganizationInvitationSchema = OrganizationInvitationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
  deletedAt: true,
  acceptedAt: true,
});

export const UpdateOrganizationInvitationSchema = OrganizationInvitationSchema.omit({
  createdAt: true,
  updatedAt: true,
  organizationId: true,
  invitedByUserId: true,
  email: true,
  role: true,
}).partial();