import { z } from "zod";
import { UserOrganizationSchema } from "./user-organizations";

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
  userOrganizations: z.array(UserOrganizationSchema).nullable(),
});

export type User = z.infer<typeof UserSchema>;