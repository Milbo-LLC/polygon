import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { OrganizationSchema } from "~/validators/organizations";
import { parseProject } from "./projects";
import { MemberRoleEnum } from "~/validators/user-organizations";

type OrganizationWithProjects = Prisma.OrganizationGetPayload<{
  include: { 
    projects: {
      include: {
        documents: true
      }
    },
    organizationUsers: true
  };
}>;

export const parseOrganization = (dbOrganization: OrganizationWithProjects) => ({
  ...dbOrganization,
  projects: dbOrganization.projects.map(parseProject),
  organizationUsers: dbOrganization.organizationUsers.map(user => ({
    ...user,
    role: user.role as z.infer<typeof MemberRoleEnum>
  }))
});

export const organizationRouter = createTRPCRouter({
  get: protectedProcedure
    .output(OrganizationSchema)
    .query(async ({ ctx }) => {
      const id = ctx.organizationId
      const organization = await ctx.db.organization.findUnique({
        where: { id },
        include: {
          projects: {
            include: {
              documents: true
            }
          },
          organizationUsers: true
        }
      });

      if (!organization) {
        throw new Error("Organization not found");
      }

      return parseOrganization(organization);
    }),
});
