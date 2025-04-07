import { Suspense } from "react";
import { AuthForm } from "~/app/(auth)/_components/auth-form";
import { Skeleton } from "~/components/ui/skeleton";

export default function SignupPage() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center max-w-2xl w-full">
          <Skeleton className="h-[300px] w-full max-w-md" />
        </div>
      }>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  )
}