import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

// Function to get the base URL depending on the environment
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const currentHost = window.location.host;

    // 🚀 PR environments use their own domain as the auth server
    if (currentHost.includes('-pr-')) {
      return window.location.origin;
    }
  }

  // Fallback to the staging/prod auth URL
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
