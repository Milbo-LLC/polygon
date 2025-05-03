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

import { getUserSession } from "~/server/auth"; 
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
  session: any | null; // Using a generic session type for Better Auth
  headers: Headers;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  console.log("\n\n=== CREATING TRPC CONTEXT ===");
  console.log("Headers present:", Object.fromEntries([...opts.headers.entries()]));
  
  const session = await getUserSession();
  console.log("Session obtained:", session ? {
    userId: session.user?.id,
    activeOrgId: session.user ? (session.user as any).activeOrganizationId : undefined,
    userEmail: session.user?.email
  } : 'No session');
  
  return createInnerTRPCContext({
    session,
    headers: opts.headers,
  });
};

export const createInnerTRPCContext = async (opts: CreateContextOptions) => {
  const { session, headers } = opts;
  
  // Debug session information
  console.log('Session in createInnerTRPCContext:', 
    session ? {
      userId: session.user?.id,
      activeOrgId: session.user ? (session.user as any).activeOrganizationId : undefined,
      userEmail: session.user?.email
    } : 'No session');
  
  if (!session?.user) {
    return {
      db,
      session: null,
      organizationId: null,
    };
  }

  // Get user's organizations
  const userOrganizations = await db.userOrganization.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  console.log(`Found ${userOrganizations.length} organizations for user ${session.user.id}`);
  
  if (userOrganizations.length > 0) {
    console.log('Available organizations:', userOrganizations.map(uo => ({
      id: uo.organizationId,
      name: uo.organization.name,
      role: uo.role
    })));
  }

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
  
  // CRITICAL FIX: After updating the user with a new activeOrganizationId, 
  // we need to make sure we have the latest version from the database
  
  // Get the most up-to-date user with the activeOrganizationId from the database
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { 
      id: true,
      activeOrganizationId: true 
    }
  });
  
  console.log('Database user check:', {
    userId: currentUser?.id,
    activeOrgId: currentUser?.activeOrganizationId,
    sessionActiveOrgId: (session.user as any).activeOrganizationId
  });
  
  // Priority order for organization ID:
  // 1. Organization ID from headers (if valid)
  // 2. User's activeOrganizationId from database (if valid)
  // 3. User's activeOrganizationId from session (if valid) - this might be outdated
  // 4. Fallback to personal org or first available org
  
  // Try to get organization ID from header
  const headerOrgId = headers.get("x-organization-id");
  
  // 1. If orgId is provided in headers, validate it
  if (headerOrgId) {
    console.log(`Header organization ID found: ${headerOrgId}`);
    const hasAccess = userOrganizations.some(
      (uo) => uo.organizationId === headerOrgId
    );
    if (!hasAccess) {
      console.log(`⚠️ User ${session.user.id} attempted to access unauthorized org ${headerOrgId}`);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid organization access",
      });
    }
    
    // Use the explicitly requested org ID from headers
    console.log(`🔑 Using organization ID from headers: ${headerOrgId} for user ${session.user.id}`);
    return {
      db,
      session,
      organizationId: headerOrgId,
    };
  }

  // 2. If the database user has an activeOrganizationId, use that (fresh data)
  if (currentUser?.activeOrganizationId) {
    console.log(`Active organization ID found in database: ${currentUser.activeOrganizationId}`);
    
    // Validate that the user has access to this organization
    const hasAccess = userOrganizations.some(
      (uo) => uo.organizationId === currentUser.activeOrganizationId
    );
    
    if (hasAccess) {
      console.log(`🔑 Using active organization ID from database: ${currentUser.activeOrganizationId} for user ${session.user.id}`);
      return {
        db,
        session,
        organizationId: currentUser.activeOrganizationId,
      };
    }
    console.log(`⚠️ User ${session.user.id} has invalid activeOrganizationId ${currentUser.activeOrganizationId} in database. User does not have access to this organization.`);
  }

  // 3. If user has an activeOrganizationId in the session, use that (might be outdated)
  const sessionActiveOrgId = (session.user as any).activeOrganizationId;
  if (sessionActiveOrgId) {
    console.log(`Active organization ID found in session: ${sessionActiveOrgId}`);
    console.log(`Session user object:`, JSON.stringify(session.user, null, 2));
    
    // Validate that the user has access to this organization
    const hasAccess = userOrganizations.some(
      (uo) => uo.organizationId === sessionActiveOrgId
    );
    
    if (hasAccess) {
      console.log(`🔑 Using active organization ID from session: ${sessionActiveOrgId} for user ${session.user.id}`);
      return {
        db,
        session,
        organizationId: sessionActiveOrgId,
      };
    }
    // If the active org ID is invalid, continue to fallback options
    console.log(`⚠️ User ${session.user.id} has invalid activeOrganizationId ${sessionActiveOrgId} in session. User does not have access to this organization.`);
    console.log(`Available organizations:`, userOrganizations.map(o => o.organizationId));
  } else {
    console.log(`⚠️ No activeOrganizationId found in session for user ${session.user.id}`);
    console.log(`Session user object:`, JSON.stringify(session.user, null, 2));
  }
  
  // 4. Fallback options: personal org or first available org
  const fallbackOrgId = userOrganizations.find(uo => uo.organizationId === session.user.id)?.organizationId || userOrganizations[0]?.organizationId;
  console.log(`🔑 Using fallback organization ID: ${fallbackOrgId} for user ${session.user.id}`);
  
  return {
    db,
    session,
    organizationId: fallbackOrgId,
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
