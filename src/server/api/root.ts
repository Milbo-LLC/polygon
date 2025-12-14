import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { projectRouter } from "./routers/projects";
import { documentRouter } from "./routers/documents";
import { organizationRouter } from "./routers/organizations";
import { userOrganizationRouter } from "./routers/user-organizations";
import { userRouter } from "./routers/user";
import { notificationRouter } from "./routers/notifications";
import { organizationInvitationRouter } from "./routers/organization-invitations";
import { operationsRouter } from "./routers/operations";
import { exportRouter } from "./routers/export";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  project: projectRouter,
  document: documentRouter,
  organization: organizationRouter,
  userOrganization: userOrganizationRouter,
  user: userRouter,
  notification: notificationRouter,
  organizationInvitation: organizationInvitationRouter,
  operations: operationsRouter,
  export: exportRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
