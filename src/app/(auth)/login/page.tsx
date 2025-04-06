import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { AuthForm } from "~/app/(auth)/_components/auth-form";
import { AUTH_REDIRECT_PATH_SIGNED_IN } from "~/constants/links";

// This is a server component that just passes the entire URL to the client component
export default async function LoginPage() {
  const session = await auth();

  if (session) {
    // If user is already authenticated, redirect to default path
    // We'll let client-side code handle redirection to callback URL
    redirect(AUTH_REDIRECT_PATH_SIGNED_IN);
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <AuthForm mode="login" />
    </div>
  );
}
