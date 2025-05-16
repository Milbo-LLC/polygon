"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card"
import { signInWithGoogle, sendOTPForSignIn, signInWithOTP } from "~/server/auth/client"
import { Button } from "~/components/ui/button"
import { useSearchParams } from "next/navigation"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"

export function AuthForm(props: { mode?: "login" | "signup" }) {
  const { mode = "login" } = props
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/projects'
  
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showOtpForm, setShowOtpForm] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle(callbackUrl)
    } catch (error) {
      console.error("Google sign-in failed:", error)
      setError("Failed to sign in with Google. Please try again.")
      setIsLoading(false)
    }
  }
  
  const handleEmailOption = () => {
    setShowEmailForm(true)
    setError(null)
  }
  
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email?.includes('@')) {
      setError("Please enter a valid email address")
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      await sendOTPForSignIn(email)
      setShowOtpForm(true)
    } catch (error) {
      console.error("Failed to send OTP:", error)
      setError("Failed to send verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) {
      setError("Please enter the verification code")
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      await signInWithOTP(email, otp, callbackUrl)
    } catch (error) {
      console.error("OTP verification failed:", error)
      setError("Invalid verification code. Please try again.")
      setIsLoading(false)
    }
  }
  
  const handleBack = () => {
    if (showOtpForm) {
      setShowOtpForm(false)
    } else if (showEmailForm) {
      setShowEmailForm(false)
    }
    setError(null)
  }

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl w-full">
      <Card className="flex flex-col items-center justify-center w-full h-full py-8">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          {showEmailForm && (
            <CardDescription>
              {showOtpForm 
                ? "Enter the verification code sent to your email" 
                : "We'll send you a verification code"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col w-full gap-4">
          {!showEmailForm ? (
            <>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Login with Google"}
              </Button>
              
              <div className="w-full my-2">
                <div className="flex items-center gap-2 w-full">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <Separator className="flex-1" />
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleEmailOption}
                disabled={isLoading}
              >
                {mode === "login" ? "Login with Email" : "Sign up with Email"}
              </Button>
            </>
          ) : showOtpForm ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4 w-full">
              <div className="grid gap-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4 w-full">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          )}
        </CardContent>
        {(showEmailForm || showOtpForm) && (
          <CardFooter>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
