/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Session } from "next-auth";

import { auth } from "~/server/auth"; 
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

interface CreateContextOptions {
  session: Session | null;
  headers: Headers;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return createInnerTRPCContext({
    session,
    headers: opts.headers,
  });
};

const createInnerTRPCContext = async (opts: CreateContextOptions) => {
  const { session, headers } = opts;
  
  if (!session?.user) {
    return {
      db,
      session: null,
      organizationId: null,
    };
  }

  // Try to get organization ID from header
  const organizationId = headers.get("x-organization-id");
  
  // Get user's organizations
  const userOrganizations = await db.userOrganization.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (userOrganizations.length === 0) {
    console.log(`⚠️ No organizations found for user ${session.user.id}, creating personal org`);
    
    // Create a personal organization if none exists
    try {
      // Check if the personal organization exists
      const existingPersonalOrg = await db.organization.findUnique({
        where: { id: session.user.id },
      });
      
      if (!existingPersonalOrg) {
        // Create personal organization with the user's ID
        const organization = await db.organization.create({
          data: {
            id: session.user.id,
            name: 'Personal',
          },
        });
        
        // Create user-organization relationship
        await db.userOrganization.create({
          data: {
            userId: session.user.id,
            organizationId: organization.id,
            role: 'owner',
          },
        });
        
        console.log(`✅ Created personal organization for user ${session.user.id}`);
        
        // Use this new organization as the context
        return {
          db,
          session,
          organizationId: organization.id,
        };
      }
    } catch (error) {
      console.error("❌ Error creating personal organization:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error creating organization",
      });
    }
  }

  // If orgId is provided, validate it
  if (organizationId) {
    const hasAccess = userOrganizations.some(
      (uo) => uo.organizationId === organizationId
    );
    if (!hasAccess) {
      console.log(`⚠️ User ${session.user.id} attempted to access unauthorized org ${organizationId}`);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid organization access",
      });
    }
  }

  // Use provided org ID, user ID as personal org, or default to first organization
  const effectiveOrgId = organizationId || session.user.id || userOrganizations[0]?.organizationId;
  
  console.log(`🔑 Using organization ID: ${effectiveOrgId} for user ${session.user.id}`);

  return {
    db,
    session,
    organizationId: effectiveOrgId,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!ctx.organizationId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No organization context",
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

export const orgProtectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
