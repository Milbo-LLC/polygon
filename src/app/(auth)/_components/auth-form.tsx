"use client"

import { Suspense } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { signInWithGoogle } from "~/server/auth/client"
import { FaGoogle as GoogleIcon } from "react-icons/fa"
import { Button } from "~/components/ui/button"
import { useSearchParams } from "next/navigation"

export function AuthForm({ 
  mode = "login",
}: { 
  mode?: "login" | "signup";
}) {
  const searchParams = useSearchParams();
  
  // Get callback URL from params or use default
  const callbackUrl = searchParams.get('callbackUrl') || '/projects';
  
  // Handle Google sign-in
  const handleGoogleSignIn = () => {
    signInWithGoogle(callbackUrl);
  };

  console.log("Rendering AuthForm with mode:", mode);

  return (
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
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            {mode === "login" ? "Login with Google" : "Sign up with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
