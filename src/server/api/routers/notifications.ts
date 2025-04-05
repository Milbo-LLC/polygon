import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { CreateNotificationSchema, NotificationSchema, UpdateNotificationSchema } from "~/validators/notifications";

export const notificationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateNotificationSchema)
    .output(NotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.session.user.organizations[0]?.id;
      if (!organizationId) {
        throw new Error("No active organization");
      }

      const notification = await ctx.db.notification.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          type: input.type,
          channel: input.channel,
        },
      });

      return notification;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(NotificationSchema)
    .query(async ({ ctx, input }) => {
      const { id } = input;

      const notification = await ctx.db.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      return notification;
    }),

  getAll: protectedProcedure
    .output(z.array(NotificationSchema))
    .query(async ({ ctx }) => {
      const notifications = await ctx.db.notification.findMany();
      return notifications;
    }),

  update: protectedProcedure
    .input(UpdateNotificationSchema)
    .output(NotificationSchema)
    .mutation(async ({ ctx, input }) => {

      const notification = await ctx.db.notification.update({
        where: { id: input.id },
        data: {
          sentAt: input.sentAt,
          readAt: input.readAt,
          clickedAt: input.clickedAt,
        },
      });

      return notification;
    }),
});
