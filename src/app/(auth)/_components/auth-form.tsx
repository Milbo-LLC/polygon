"use client"

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

function AuthFormContent({ 
  mode = "login",
}: { 
  mode?: "login" | "signup";
}) {
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') ?? '/projects';
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(callbackUrl);
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

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

export function AuthForm(props: { mode?: "login" | "signup" }) {
  return <AuthFormContent {...props} />;
}
