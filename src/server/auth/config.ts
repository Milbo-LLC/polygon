import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";
import type { Organization } from "@prisma/client";

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
        include: { organizations: true }
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          organizations: dbUser?.organizations ?? [],
        },
      };
    },
    signIn: async ({ user }) => {
      try {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
          include: { organizations: true }
        });

        console.log('existingUser: ', existingUser);

        if (existingUser && existingUser.organizations?.length === 0) {
          await db.organization.create({
            data: {
              name: 'Personal',
              users: {
                connect: { id: existingUser.id },
              },
            },
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
