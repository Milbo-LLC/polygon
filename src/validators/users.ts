import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const UpdateUserSchema = UserSchema.omit({
  createdAt: true,
  updatedAt: true,
}).partial();