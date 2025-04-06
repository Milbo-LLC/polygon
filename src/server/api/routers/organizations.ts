import { z } from "zod";
import { type Prisma, type User } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateOrganizationSchema, OrganizationSchema, OrganizationWithUserOrganizationsSchema, UpdateOrganizationSchema } from "~/validators/organizations";
import { parseProject } from "./projects";
import { type MemberRoleEnum } from "~/validators/user-organizations";

type OrganizationWithProjects = Prisma.OrganizationGetPayload<{
  include: { 
    projects: {
      include: {
        documents: true
      }
    },
    organizationUsers: {
      include: {
        user: true
      }
    }
  };
}>;

export const parseOrganization = (dbOrganization: OrganizationWithProjects) => ({
  ...dbOrganization,
  projects: dbOrganization.projects.map(parseProject),
  userOrganizations: dbOrganization.organizationUsers.map(userOrg => ({
    ...userOrg,
    user: userOrg.user,
    role: userOrg.role as z.infer<typeof MemberRoleEnum>
  }))
});

export const organizationRouter = createTRPCRouter({
  get: protectedProcedure
    .output(OrganizationWithUserOrganizationsSchema)
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
          organizationUsers: {
            include: {
              user: true
            }
          }
        }
      });

      console.log('server - organization: ', organization);

      if (!organization) {
        throw new Error("Organization not found");
      }

      return parseOrganization(organization);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(OrganizationSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const organization = await ctx.db.organization.findUnique({
        where: { id }, include: {
          projects: {
            include: {
              documents: true
            }
          },
          organizationUsers: {
            include: {
              user: true
            }
          }
        }
      }); 

      if (!organization) {
        throw new Error("Organization not found");
      }

      return parseOrganization(organization);
    }),

  create: protectedProcedure
    .input(CreateOrganizationSchema)
    .output(OrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, logoUrl } = input;

      const organization = await ctx.db.organization.create({
        data: {
          name,
          logoUrl
        },
        include: {
          projects: {
            include: {
              documents: true
            }
          },
          organizationUsers: {
            include: {
              user: true
            }
          }
        }
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.userOrganization.create({
          data: {
            userId: ctx.session.user.id,
            organizationId: organization.id,
            role: 'owner',
          },
        });
      });

      if (!organization) {
        throw new Error("Failed to create organization");
      }

      return parseOrganization(organization);
    }),
  
  update: protectedProcedure
    .input(UpdateOrganizationSchema)
    .output(OrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, name, logoUrl } = input;

      const updatedOrganization = await ctx.db.organization.update({
        where: { id },
        data: {
          name,
          logoUrl
        },
        include: {
          projects: {
            include: {
              documents: true
            }
          },
          organizationUsers: {
            include: {
              user: true
            }
          }
        }
      });

      if (!updatedOrganization) {
        throw new Error("Organization not found after update");
      }

      return parseOrganization(updatedOrganization);
    }),
});
