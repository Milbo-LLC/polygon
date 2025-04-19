import { z } from "zod";
import { sendOrganizationInvitationEmail } from "~/lib/email-server";

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
      const organizationId = ctx.organizationId;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      // Check if user has permission to create invitations (must be owner or admin)
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: input.organizationId,
          role: { in: ['owner', 'admin'] }, // Only owners and admins can send invitations
          deletedAt: null
        }
      });
      
      if (!userOrg) {
        throw new Error("You don't have permission to send invitations for this organization");
      }

      // Check if the user with this email is already a member of the organization
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true }
      });

      if (existingUser) {
        // User exists, check if they're already in the organization
        const existingMembership = await ctx.db.userOrganization.findFirst({
          where: {
            userId: existingUser.id,
            organizationId: input.organizationId,
            deletedAt: null // Only check active memberships
          }
        });

        if (existingMembership) {
          throw new Error("This user is already a member of the organization");
        }
      }

      // Check for pending invitations
      const pendingInvitation = await ctx.db.organizationInvitation.findFirst({
        where: {
          email: input.email,
          organizationId: input.organizationId,
          acceptedAt: null,
          deletedAt: null,
          expiresAt: {
            gt: new Date() // Not expired
          }
        }
      });

      if (pendingInvitation) {
        throw new Error("There is already a pending invitation for this email address");
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
          include: {
            organization: true,
            invitedByUser: true,
          },
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
      if (organization?.name && inviter?.name) {
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
        include: {
          organization: true,
          invitedByUser: true,
        },
      });

      if (!organizationInvitation) {
        throw new Error("Organization invitation not found");
      }

      return organizationInvitation;
    }),

  getAll: protectedProcedure
    .output(z.array(OrganizationInvitationSchema))
    .query(async ({ ctx }) => {
      const organizationId = ctx.organizationId;
      const organizationInvitations = await ctx.db.organizationInvitation.findMany({
        where: {
          organizationId,
          deletedAt: null,
          acceptedAt: null,
        },
        include: {
          organization: true,
          invitedByUser: true,
        },
      });
      return organizationInvitations;
    }),

  update: protectedProcedure
    .input(UpdateOrganizationInvitationSchema)
    .output(OrganizationInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch the invitation to get the organization ID
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { id: input.id },
        select: { organizationId: true }
      });
      
      if (!invitation) {
        throw new Error("Invitation not found");
      }
      
      // Check if user has permission to update invitations (must be owner or admin)
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: invitation.organizationId,
          role: { in: ['owner', 'admin'] }, // Only owners and admins can update invitations
          deletedAt: null
        }
      });
      
      if (!userOrg) {
        throw new Error("You don't have permission to modify invitations for this organization");
      }

      const organizationInvitation = await ctx.db.organizationInvitation.update({
        where: { id: input.id },
        data: {
          deletedAt: input.deletedAt,
          acceptedAt: input.acceptedAt,
        },
        include: {
          organization: true,
          invitedByUser: true,
        },
      });

      return organizationInvitation;
    }),

  accept: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(OrganizationInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      
      // Find the invitation
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { id },
        include: {
          organization: true,
          invitedByUser: true,
        },
      });
      
      if (!invitation) {
        throw new Error("Invitation not found");
      }
      
      // Check if the current user is the one who was invited
      if (invitation.email !== ctx.session.user.email) {
        throw new Error("You can only accept invitations sent to your email address");
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        throw new Error("This invitation has expired");
      }
      
      // Check if already accepted
      if (invitation.acceptedAt) {
        throw new Error("This invitation has already been accepted");
      }
      
      // Update the invitation as accepted
      const updatedInvitation = await ctx.db.organizationInvitation.update({
        where: { id },
        data: { acceptedAt: new Date() },
        include: {
          organization: true,
          invitedByUser: true,
        },
      });
      
      return updatedInvitation;
    }),
});
