import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import type { Organization } from "@prisma/client";
import { db } from "~/server/db";
import { sendWelcomeEmailServer, sendOtpEmail } from "~/lib/email-server";
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

// -------------------------
// Trusted Origins Logic 🛡
// -------------------------

// 🔥 Use Railway PR URL first if present
const host =
  process.env.RAILWAY_PUBLIC_DOMAIN ??
  process.env.RAILWAY_STATIC_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  process.env.VERCEL_URL ??
  process.env.HOSTNAME ??
  "";

const isPR =
  host.includes("pr-") ||
  host.includes("polygon-pr-") ||
  host.includes("polygon-polygon-pr-");

const trustedOrigins = [
  "https://polygon-staging.up.railway.app",
  "https://polygon.up.railway.app",
  "http://localhost:3000",
];

if (isPR && host) {
  const prDomain = `https://${host}`;
  trustedOrigins.push(prDomain);
}

export const authConfig = betterAuth({
  // Social providers
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      sendVerificationOnSignUp: true
    })
  ],

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

  trustedOrigins,

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
