import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { AuthForm } from "~/app/(auth)/_components/auth-form";
import { AUTH_REDIRECT_PATH_SIGNED_IN } from "~/constants/links";
import { headers } from "next/headers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await auth();
  const { callbackUrl } = searchParams;

  if (session) {
    // If there's a callbackUrl, redirect there instead of the default path
    if (callbackUrl) {
      redirect(callbackUrl);
    } else {
      redirect(AUTH_REDIRECT_PATH_SIGNED_IN);
    }
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <AuthForm mode="login" callbackUrl={callbackUrl} />
    </div>
  );
}
