"use client"

import { Suspense, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { useSession, signInWithGoogle } from "~/server/auth/client"
import { FaGoogle as GoogleIcon } from "react-icons/fa"
import { Button } from "~/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

// Helper to get the current origin
const getCurrentOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Helper to check if in PR environment
const isPREnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return host.includes('polygon-polygon-pr-') || host.includes('polygon-pr-');
  }
  return false;
};

export function AuthForm({ 
  mode = "login",
}: { 
  mode?: "login" | "signup";
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get callbackUrl from the URL params or use default
  const paramCallbackUrl = searchParams.get('callbackUrl');
  const errorCode = searchParams.get('error');
  
  // For PR environments, ensure the callback URL includes the PR domain
  const callbackUrl = (() => {
    // If there is a specific callback URL in the params, use that
    if (paramCallbackUrl) {
      return paramCallbackUrl;
    }
    
    // In PR environments, ensure we have the full origin in the callback
    if (isPREnvironment()) {
      return `${getCurrentOrigin()}/projects`;
    }
    
    // Default fallback
    return '/projects';
  })();
  
  console.log(`Auth form using callback URL: ${callbackUrl}`);
  
  // Handle redirection after authentication
  useEffect(() => {
    if (!isPending && session) {
      console.log(`Session detected, redirecting to: ${callbackUrl}`);
      // For PR environments, use window.location for more reliable redirects
      if (isPREnvironment() && callbackUrl.startsWith(getCurrentOrigin())) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
      }
    }
  }, [isPending, session, callbackUrl, router]);
  
  // Auto retry on error
  useEffect(() => {
    if (errorCode === 'please_restart_the_process') {
      const timer = setTimeout(() => {
        void signInWithGoogle(callbackUrl);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [errorCode, callbackUrl]);
  
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
              onClick={() => {
                console.log(`Initiating Google sign-in with callback: ${callbackUrl}`);
                void signInWithGoogle(callbackUrl);
              }}
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
