import { z } from "zod";
import { type UserOrganization, type Organization, type User } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { type MemberRole } from "~/validators/user-organizations";
import { UserOrganizationWithOrgSchema } from "~/validators/extended-schemas";

type UserOrganizationWithOrganization = UserOrganization & {
  organization: Organization;
  user: User;
};

export const parseUserOrganization = (uo: UserOrganizationWithOrganization) => ({
  createdAt: uo.createdAt,
  updatedAt: uo.updatedAt,
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
          organizationId
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
          where: { userId },
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

  getAllByOrganizationId: protectedProcedure
    .output(z.array(UserOrganizationWithOrgSchema))
    .query(async ({ ctx }) => {
      try {
        const organizationId = ctx.organizationId;
        const userOrganizations = await ctx.db.userOrganization.findMany({
          where: { organizationId },
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
});
