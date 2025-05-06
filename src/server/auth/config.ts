import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { Organization } from "@prisma/client";
import { db } from "~/server/db";
import { sendWelcomeEmailServer } from "~/lib/email-server";
import { env } from "~/env";
import { type SessionEventProps, type SignInEventProps } from "~/types/auth";

/**
 * This file was converted from NextAuth.js to Better Auth
 */

declare module "better-auth" {
  interface UserWithAdditionalFields {
    organizations: Organization[];
    activeOrganizationId?: string | null;
  }

  interface SessionWithAdditionalFields {
    user: {
      id: string;
      organizations: Organization[];
      activeOrganizationId?: string | null;
      name?: string;
      email?: string;
    };
  }
}

export const authConfig = betterAuth({
  // Social providers
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  secret: env.BETTER_AUTH_SECRET,

  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  urls: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/login",
  },

  cookies: {
    sessionToken: {
      name: "__Secure-better-auth.session_token",
      options: {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        secure: true,
        domain:
          process.env.NODE_ENV === "production"
            ? new URL(env.NEXT_PUBLIC_BETTER_AUTH_URL).hostname
            : undefined,
      },
    },
  },

  trustedOrigins: (() => {
    const prHost = process.env.VERCEL_URL ?? process.env.RAILWAY_STATIC_URL ?? ""; // fallback
    const isPR = prHost.includes("polygon-pr-") || prHost.includes("polygon-polygon-pr-");
    console.log("🛡 trustedOrigins - isPR:", isPR, " prHost:", prHost);
    return isPR
      ? undefined // disable origin check for PRs
      : [
          "https://polygon-staging.up.railway.app",
          "https://polygon.up.railway.app",
          "http://localhost:3000"
        ];
  })(),

  events: {
    onSession: async ({ session, user }: SessionEventProps) => {
      if (!user.id) return session;

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          userOrganizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          organizations: dbUser?.userOrganizations.map((uo) => uo.organization) ?? [],
        },
      };
    },

    onSignIn: async ({ user }: SignInEventProps) => {
      console.log(
        "⭐ signIn callback triggered with user:",
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
        })
      );

      if (!user.id) {
        console.error("❌ No user ID available during signIn callback");
        return true;
      }

      const existingPersonalOrganization = await db.organization.findFirst({
        where: { id: user.id },
      });

      const welcomeEmailSent = await db.notification.findFirst({
        where: {
          userId: user.id,
          type: "welcome",
          channel: "email",
        },
      });

      if (!existingPersonalOrganization) {
        try {
          await db.$transaction(async (tx) => {
            const organization = await tx.organization.create({
              data: {
                id: user.id,
                name: "Personal",
              },
            });

            await tx.userOrganization.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: "owner",
              },
            });

            if (user.email && user.name && !welcomeEmailSent) {
              await sendWelcomeEmailServer(user.email, user.name);
              await tx.notification.create({
                data: {
                  userId: user.id,
                  type: "welcome",
                  channel: "email",
                  organizationId: organization.id,
                  sentAt: new Date(),
                },
              });
            }
          });
          console.log("✅ Created personal organization and sent welcome email if needed");
        } catch (txError) {
          console.error(
            "❌ Transaction failed during personal org creation:",
            txError
          );
          return true; // Don't block login even if org creation fails
        }
      }

      return true;
    },
  },
});
