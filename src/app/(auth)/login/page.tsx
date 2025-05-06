import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserSession } from "~/server/auth";
import { AuthForm } from "~/app/(auth)/_components/auth-form";
import { AUTH_REDIRECT_PATH_SIGNED_IN } from "~/constants/links";
import { Skeleton } from "~/components/ui/skeleton";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to our application"
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
export default async function LoginPage() {
  // Get the session using Better Auth's API
  const session = await getUserSession();

  // If user is already authenticated, redirect to default path
  if (session) {
    // We'll let client-side code handle redirection to callback URL
    redirect(AUTH_REDIRECT_PATH_SIGNED_IN);
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center max-w-2xl w-full">
          <Skeleton className="h-[300px] w-full max-w-md" />
        </div>
      }>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */ 