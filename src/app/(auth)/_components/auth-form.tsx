"use client"

import { Suspense, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { signIn, useSession } from "next-auth/react"
import { FaGoogle as GoogleIcon } from "react-icons/fa"
import { Button } from "~/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { activeOrganizationIdAtom } from "~/app/(protected)/atoms"
import { useSetAtom } from "jotai"

export function AuthForm({ 
  mode = "login",
}: { 
  mode?: "login" | "signup";
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setActiveOrganizationId = useSetAtom(activeOrganizationIdAtom);
  
  // Get callbackUrl from the URL params
  const callbackUrl = searchParams.get('callbackUrl') ?? '/projects';
  
  // Handle redirection after authentication
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // If we have a session and user, ensure we have set the active organization
      if (session.user?.id) {
        // Set the user's ID as their personal organization ID
        // This matches how personal orgs are created in the signIn callback
        setActiveOrganizationId(session.user.id);
      }
      
      // Then redirect to the callback URL
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router, setActiveOrganizationId]);
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex flex-col items-center justify-center max-w-2xl w-full">
        <Card className="flex flex-col items-center justify-center w-full h-full py-10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col w-full gap-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => signIn('google', { callbackUrl })}
            >
              <GoogleIcon />
              {mode === "login" ? "Login with Google" : "Sign up with Google"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
