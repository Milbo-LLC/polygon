import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

// Function to get the base URL depending on the environment
const getBaseURL = () => {
  // For client-side, check the environment
  if (typeof window !== 'undefined') {
    // Check if we're in a PR environment
    const isPREnvironment = window.location.host.includes('polygon-pr-') || 
                           window.location.host.includes('polygon-polygon-pr-');
    
    if (isPREnvironment) {
      // For PR environments, always use the staging auth URL
      return env.NEXT_PUBLIC_BETTER_AUTH_URL;
    }
  }
  
  // Otherwise use the configured URL
  return env.NEXT_PUBLIC_BETTER_AUTH_URL;
};

// Get the current origin for use in requests
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Create the auth client with the appropriate base URL
export const authClient = createAuthClient({ 
  baseURL: getBaseURL(),
  requestOptions: {
    headers: {
      'X-Forwarded-Origin': getCurrentOrigin(),
      'X-Requested-From': getCurrentOrigin()
    },
    credentials: 'include',
    mode: 'cors'
  }
});

export const {
  useSession,
  signIn,
  signOut
} = authClient;

// Helper function for Google sign-in to make migration easier
export const signInWithGoogle = async (callbackUrl?: string) => {
  const origin = getCurrentOrigin();
  const redirectUrl = callbackUrl ?? origin;
  
  return signIn.social({
    provider: "google",
    callbackURL: redirectUrl
  });
}; 