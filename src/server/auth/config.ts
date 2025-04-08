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
      console.log('⭐ signIn callback triggered with user:', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name
      }));
      
      try {
        if (!user.id) {
          console.error('❌ No user ID available during signIn callback');
          return true;
        }

        console.log('🔍 Checking if personal organization exists for user:', user.id);
        // Check if the personal organization exists (don't check for existing user)
        const existingPersonalOrganization = await db.organization.findFirst({
          where: {
            id: user.id,
          },
        });
        
        console.log('🔍 Existing personal organization:', existingPersonalOrganization);

        const welcomeEmailSent = await db.notification.findFirst({
          where: {
            userId: user.id,
            type: 'welcome',
            channel: 'email',
          },
        });
        
        console.log('🔍 Welcome email sent:', welcomeEmailSent);

        if (!existingPersonalOrganization) {
          console.log('🏗️ Creating personal organization for user:', user.id);
          try {
            // Use a transaction to ensure all operations succeed or fail together
            await db.$transaction(async (tx) => {
              console.log('🏗️ Creating organization record...');
              const organization = await tx.organization.create({
                data: {
                  id: user.id,
                  name: 'Personal',
                },
              });
              console.log('✅ Organization created successfully:', organization.id);

              console.log('🏗️ Creating user-organization relationship...');
              // Create the user-organization relationship
              const userOrg = await tx.userOrganization.create({
                data: {
                  userId: user.id!,
                  organizationId: organization.id,
                  role: 'owner',
                },
              });
              console.log('✅ User-organization relationship created:', userOrg);
              
              if (user.email && user.name && !welcomeEmailSent) {
                console.log('📧 Sending welcome email to:', user.email);
                await sendWelcomeEmailServer(user.email, user.name);
                console.log('📧 Creating notification record...');
                await tx.notification.create({
                  data: {
                    userId: user.id!,
                    type: 'welcome',
                    channel: 'email',
                    organizationId: organization.id,
                    sentAt: new Date(),
                  },
                });
                console.log('✅ Notification record created');
              }
            });
            console.log('✅ Transaction completed successfully');
          } catch (txError) {
            console.error('❌ Transaction failed with error:', txError);
            // Let's throw this to be caught by the outer try/catch
            throw txError;
          }
        }

        console.log('✅ signIn callback completed successfully, returning true');
        return true;
      } catch (error) {
        console.error('❌ signIn callback failed with error:', error);
        // Instead of failing the sign-in, let's still return true so the user can log in
        // even if organization creation fails
        return true;
      }
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl) || url.startsWith('/')) {
        return url;
      }
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;
