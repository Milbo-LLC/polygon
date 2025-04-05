import { z } from "zod";

export const NotificationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().nullable(),
  readAt: z.date().nullable(),
  clickedAt: z.date().nullable(),
  type: z.string(),
  channel: z.string(),
  userId: z.string(),
  organizationId: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;


export const CreateNotificationSchema = NotificationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  readAt: true,
  clickedAt: true,
});

export const UpdateNotificationSchema = NotificationSchema.omit({
  createdAt: true,
  updatedAt: true,
  userId: true,
  organizationId: true,
  type: true,
  channel: true,
}).partial();