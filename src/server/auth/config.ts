import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import type { Organization } from "@prisma/client";
import { sendWelcomeEmailServer } from "~/lib/email-server";

/**
 * test
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      organizations: Organization[];
      activeOrganizationId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    organizations: Organization[];
    activeOrganizationId?: string;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      checks: ['state'],
    })
  ],

  adapter: PrismaAdapter(db) as Adapter,
  callbacks: {
    session: async ({ session, user }) => {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          userOrganizations: {
            include: {
              organization: true
            }
          }
        }
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          organizations: dbUser?.userOrganizations.map(uo => uo.organization) ?? [],
        },
      };
    },
    signIn: async ({ user }) => {
      try {
        // First ensure the user exists before doing anything else
        const existingUser = await db.user.findUnique({
          where: { id: user.id }
        });

        if (!existingUser || !user.id) {
          return true;
        }

        // Now check if the personal organization exists
        const existingPersonalOrganization = await db.organization.findFirst({
          where: {
            id: user.id,
          },
        });

        const welcomeEmailSent = await db.notification.findFirst({
          where: {
            userId: user.id,
            type: 'welcome',
            channel: 'email',
          },
        });

        if (!existingPersonalOrganization) {
          // Use a transaction to ensure all operations succeed or fail together
          await db.$transaction(async (tx) => {
            const organization = await tx.organization.create({
              data: {
                id: user.id,
                name: 'Personal',
              },
            });

            // Create the user-organization relationship
            await tx.userOrganization.create({
              data: {
                userId: user.id!,
                organizationId: organization.id,
                role: 'owner',
              },
            });
            
            if (user.email && user.name && !welcomeEmailSent) {
              await sendWelcomeEmailServer(user.email, user.name);
              await tx.notification.create({
                data: {
                  userId: user.id!,
                  type: 'welcome',
                  channel: 'email',
                  organizationId: organization.id,
                  sentAt: new Date(),
                },
              });
            }
          });
        }
        return true;
      } catch (error) {
        console.error('error: ', error);
        return false;
      }
    }
  },
} satisfies NextAuthConfig;
