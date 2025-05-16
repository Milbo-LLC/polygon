import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { env } from "~/env";

// Create the auth client with the appropriate base URL and disable automatic session
export const authClient = createAuthClient({ 
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  requestOptions: {
    credentials: 'include',
    mode: 'cors'
  },
  plugins: [
    emailOTPClient()
  ]
});

export const {
  useSession,
  signIn,
  signOut
} = authClient;

// Helper function for Google sign-in
export const signInWithGoogle = async (callbackUrl?: string) => {
  const redirectUrl = callbackUrl ?? '/projects';

  return signIn.social({
    provider: "google",
    callbackURL: redirectUrl
  });
};

export const sendOTPForSignIn = async (email: string) => {
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: "sign-in"
  });
};

export const signInWithOTP = async (email: string, otp: string, callbackUrl?: string) => {
  const redirectUrl = callbackUrl ?? '/projects';
  
  const user = await authClient.signIn.emailOtp({
    email,
    otp
  });
  
  if (user) {
    window.location.href = redirectUrl;
  }
  
  return user;
};

export const sendOTPForEmailVerification = async (email: string) => {
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: "email-verification"
  });
};

// Helper function to verify email with OTP
export const verifyEmailWithOTP = async (email: string, otp: string) => {
  return authClient.emailOtp.verifyEmail({
    email,
    otp
  });
};

export const sendOTPForPasswordReset = async (email: string) => {
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: "forget-password"
  });
};

export const resetPasswordWithOTP = async (email: string, otp: string, newPassword: string) => {
  return authClient.emailOtp.resetPassword({
    email,
    otp,
    password: newPassword
  });
};
