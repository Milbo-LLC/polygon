import { getUserSession } from "~/server/auth";
import { redirect } from "next/navigation";
import { AUTH_REDIRECT_PATH_SIGNED_IN, AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";

export default async function Home() {
  const session = await getUserSession();

  if (!session) {
    redirect(AUTH_REDIRECT_PATH_SIGNED_OUT);
  } else {
    redirect(AUTH_REDIRECT_PATH_SIGNED_IN);
  }

  return null;
}