import { type UserOrganization, type Organization } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { type MemberRole } from "~/validators/user-organizations";
import { UserSchema } from "~/validators/users";
import { UpdateUserSchema } from "~/validators/users";

type UserOrganizationWithOrganization = UserOrganization & {
  organization: Organization;
};

export const parseUserOrganization = (uo: UserOrganizationWithOrganization) => ({
  createdAt: uo.createdAt,
  updatedAt: uo.updatedAt,
  userId: uo.userId,
  organizationId: uo.organizationId,
  role: uo.role as MemberRole,
  organization: uo.organization
});

export const userRouter = createTRPCRouter({
  update: protectedProcedure
    .input(UpdateUserSchema)
    .output(UserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, name, email, image } = input;

        const updatedUser = await ctx.db.user.update({
          where: { id },
          data: { name, email, image },
        });

        return updatedUser;
      } catch (error) {
        console.error("update error:", error);
        throw error;
      }
    }),
});
