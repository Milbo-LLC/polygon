"use client"


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { signIn } from "next-auth/react"
import { FaGoogle as GoogleIcon } from "react-icons/fa"
import { Button } from "~/components/ui/button"

export function AuthForm({ mode = "login" }: { mode?: "login" | "signup" }) {
  return (
    <div className="flex flex-col items-center justify-center max-w-2xl w-full">
      <Card className="flex flex-col items-center justify-center w-full h-full py-10">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col w-full gap-4">
          <Button variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: '/projects' })}>
            <GoogleIcon />
            {mode === "login" ? "Login with Google" : "Sign up with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
