import { z } from "zod";
import { sendWelcomeEmailServer, sendOrganizationInvitationEmail } from "~/lib/email-server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { OrganizationInvitationSchema, UpdateOrganizationInvitationSchema } from "~/validators/organization-invitations";
import { CreateOrganizationInvitationSchema } from "~/validators/organization-invitations";

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const organizationInvitationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateOrganizationInvitationSchema)
    .output(OrganizationInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizations[0]?.id;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const expiresAt = new Date(Date.now() + ONE_WEEK_IN_MS);

      // Create a data object with all properties explicitly typed
      const data = {
        email: input.email,
        organizationId: input.organizationId,
        role: input.role,
        invitedByUserId: ctx.session.user.id,
        expiresAt,
      };

      // Use a transaction to ensure both actions complete or fail together
      const [organizationInvitation] = await ctx.db.$transaction([
        // Create the invitation
        ctx.db.organizationInvitation.create({
          data,
        }),
        
        // Create a notification record for tracking
        ctx.db.notification.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: input.organizationId,
            type: 'organization_invitation',
            channel: 'email',
            sentAt: new Date(),
          },
        })
      ]);

      // Fetch organization and inviter details for the email
      const [organization, inviter] = await Promise.all([
        ctx.db.organization.findUnique({
          where: { id: input.organizationId },
        }),
        ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
        })
      ]);

      // Send the invitation email
      if (organization && inviter && inviter.name) {
        await sendOrganizationInvitationEmail(
          input.email,
          inviter.name,
          organization.name,
          input.role,
          organizationInvitation.id
        );
      }

      return organizationInvitation;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(OrganizationInvitationSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const organizationInvitation = await ctx.db.organizationInvitation.findUnique({
        where: { id },
      });

      if (!organizationInvitation) {
        throw new Error("Organization invitation not found");
      }

      return organizationInvitation;
    }),

  getAll: protectedProcedure
    .output(z.array(OrganizationInvitationSchema))
    .query(async ({ ctx }) => {
      const organizationInvitations = await ctx.db.organizationInvitation.findMany();
      return organizationInvitations;
    }),

  update: protectedProcedure
    .input(UpdateOrganizationInvitationSchema)
    .output(OrganizationInvitationSchema)
    .mutation(async ({ ctx, input }) => {

      const organizationInvitation = await ctx.db.organizationInvitation.update({
        where: { id: input.id },
        data: {
          deletedAt: input.deletedAt,
        },
      });

      return organizationInvitation;
    }),
});
