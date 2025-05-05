import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

// Function to get the base URL depending on the environment
const getBaseURL = () => {
  // For client-side, ensure we use the current origin if in production
  if (typeof window !== 'undefined') {
    // In the browser
    if (process.env.NODE_ENV === 'production') {
      return window.location.origin;
    }
  }
  
  // Otherwise use the configured URL
  return env.NEXT_PUBLIC_BETTER_AUTH_URL;
};

export const authClient = createAuthClient({
    baseURL: getBaseURL()
});

export const {
    useSession,
    signIn,
    signOut
} = authClient;

// Helper function for Google sign-in to make migration easier
export const signInWithGoogle = async (callbackUrl?: string) => {
    return signIn.social({
        provider: "google",
        callbackURL: callbackUrl
    });
}; 