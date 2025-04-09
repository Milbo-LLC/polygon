import { z } from "zod";
import { type UserOrganization, type Organization, type User } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  orgProtectedProcedure,
} from "~/server/api/trpc";
import { UpdateUserOrganizationSchema, type MemberRole } from "~/validators/user-organizations";
import { UserOrganizationWithOrgSchema } from "~/validators/extended-schemas";

type UserOrganizationWithOrganization = UserOrganization & {
  organization: Organization;
  user: User;
};

export const parseUserOrganization = (uo: UserOrganizationWithOrganization) => ({
  createdAt: uo.createdAt,
  updatedAt: uo.updatedAt,
  deletedAt: uo.deletedAt,
  userId: uo.userId,
  organizationId: uo.organizationId,
  role: uo.role as MemberRole,
  organization: uo.organization,
  user: uo.user
});

export const userOrganizationRouter = createTRPCRouter({
  get: protectedProcedure
    .output(UserOrganizationWithOrgSchema)
    .query(async ({ ctx }) => {
      const organizationId = ctx.organizationId;
      const userId = ctx.session.user.id;

      const userOrganization = await ctx.db.userOrganization.findFirst({
        where: { 
          userId,
          organizationId,
          deletedAt: null
        },
        include: {
          organization: true,
          user: true
        }
      });

      if (!userOrganization) {
        throw new Error("User organization not found");
      }

      return parseUserOrganization(userOrganization);
    }),
  
  getAll: protectedProcedure
    .output(z.array(UserOrganizationWithOrgSchema))
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const userOrganizations = await ctx.db.userOrganization.findMany({
          where: { userId, deletedAt: null },
          include: { organization: true, user: true }
        });

        if (!userOrganizations) {
          throw new Error("User organizations not found");
        }

        const parsed = userOrganizations.map(parseUserOrganization);
        
        // Validate manually to see specific errors
        const result = z.array(UserOrganizationWithOrgSchema).safeParse(parsed);
        if (!result.success) {
          console.error("Validation error details:", result.error.format());
          throw new Error(`Validation failed: ${JSON.stringify(result.error.format())}`);
        }
        
        return parsed;
      } catch (error) {
        console.error("getAll error:", error);
        throw error;
      }
    }),

  getAllByOrganizationId: orgProtectedProcedure
    .output(z.array(UserOrganizationWithOrgSchema))
    .query(async ({ ctx }) => {
      try {
        const organizationId = ctx.organizationId;
        const userOrganizations = await ctx.db.userOrganization.findMany({
          where: { organizationId, deletedAt: null },
          include: { organization: true, user: true }
        });

        if (!userOrganizations) {
          throw new Error("User organizations not found");
        }

        const parsed = userOrganizations.map(parseUserOrganization);

        // Validate manually to see specific errors
        const result = z.array(UserOrganizationWithOrgSchema).safeParse(parsed);
        if (!result.success) {
          console.error("Validation error details:", result.error.format());
          throw new Error(`Validation failed: ${JSON.stringify(result.error.format())}`);
        }

        return parsed;
      } catch (error) {
        console.error("getAll error:", error);
        throw error;
      }
    }),

  create: orgProtectedProcedure
    .input(z.object({
      userId: z.string(),
      organizationId: z.string(),
      role: z.string()
    }))
    .output(UserOrganizationWithOrgSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, organizationId, role } = input;
        
        const existingUserOrg = await ctx.db.userOrganization.findFirst({
          where: { 
            userId,
            organizationId,
            deletedAt: null
          }
        });
        
        if (existingUserOrg) {
          throw new Error("User is already a member of this organization");
        }
        
        const userOrganization = await ctx.db.userOrganization.create({
          data: {
            userId,
            organizationId,
            role
          },
          include: {
            organization: true,
            user: true
          }
        });
        
        return parseUserOrganization(userOrganization);
      } catch (error) {
        console.error("create error:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(UpdateUserOrganizationSchema)
    .output(UserOrganizationWithOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, organizationId, role } = input;

      // Prevent setting role to owner
      if (role === "owner") {
        throw new Error("Cannot set a user's role to owner");
      }

      // Check if user has permission to update
      const currentUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
          deletedAt: null
        }
      });

      if (!currentUserOrg || !(currentUserOrg.role === "owner" || 
          (currentUserOrg.role === "admin" && role as string !== "owner"))) {
        throw new Error("You don't have permission to update this user's role");
      }

      // Find the user organization record to update
      const targetUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId,
          organizationId,
          deletedAt: null
        },
        include: {
          organization: true,
          user: true
        }
      });

      if (!targetUserOrg) {
        throw new Error("User organization not found");
      }

      // Prevent changing an owner's role
      if (targetUserOrg.role as MemberRole === "owner") {
        throw new Error("Owner roles cannot be changed");
      }

      // Use updateMany with specific conditions instead of update by ID
      await ctx.db.userOrganization.updateMany({
        where: {
          userId,
          organizationId,
          deletedAt: null
        },
        data: {
          role
        }
      });

      // Fetch the updated record
      const updatedUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId,
          organizationId,
          deletedAt: null
        },
        include: {
          organization: true,
          user: true
        }
      });

      console.log("updatedUserOrg: ", updatedUserOrg);

      if (!updatedUserOrg) {
        throw new Error("User organization not found after update");
      }

      return parseUserOrganization(updatedUserOrg);
    }),

  // Soft delete a user from organization
  remove: protectedProcedure
    .input(z.object({
      userId: z.string(),
      organizationId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, organizationId } = input;

      // Check if user has permission to remove
      const currentUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
          deletedAt: null
        }
      });

      const targetUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId,
          organizationId,
          deletedAt: null
        }
      });

      if (!currentUserOrg || !targetUserOrg) {
        throw new Error("User organization not found");
      }

      // Only owners can remove other owners/admins
      if ((targetUserOrg.role === "owner" || targetUserOrg.role === "admin") 
          && currentUserOrg.role !== "owner") {
        throw new Error("Only owners can remove owners or admins");
      }

      // Use updateMany with specific conditions for soft delete
      await ctx.db.userOrganization.updateMany({
        where: {
          userId,
          organizationId,
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });

      // Return the updated record for consistency
      const removedUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId,
          organizationId,
          deletedAt: { not: null }
        },
        include: {
          organization: true,
          user: true
        }
      });

      if (!removedUserOrg) {
        throw new Error("Failed to soft delete user organization");
      }

      return parseUserOrganization(removedUserOrg);
    }),
});
