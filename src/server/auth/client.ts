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
      console.log('PR environment using staging auth URL:', env.NEXT_PUBLIC_BETTER_AUTH_URL);
      return env.NEXT_PUBLIC_BETTER_AUTH_URL;
    }
    
    // For other Railway environments or production, use the current origin
    if (window.location.host.includes('.up.railway.app') || process.env.NODE_ENV === 'production') {
      console.log('Using current window origin for auth API:', window.location.origin);
      return window.location.origin;
    }
  }
  
  // Otherwise use the configured URL for development
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
export const authClient = typeof window !== 'undefined' 
  ? createAuthClient({ 
      baseURL: getBaseURL(),
      requestOptions: {
        headers: {
          // Add origin header to help with CORS
          'X-Forwarded-Origin': getCurrentOrigin(),
          'X-Requested-From': getCurrentOrigin()
        },
        credentials: 'include', // Ensure cookies are sent with requests
      }
    })
  : createAuthClient({ baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL });

export const {
  useSession,
  signIn,
  signOut
} = authClient;

// Helper function for Google sign-in to make migration easier
export const signInWithGoogle = async (callbackUrl?: string) => {
  // Log the current origin and environment to help with debugging
  if (typeof window !== 'undefined') {
    console.log('Current origin for sign-in:', window.location.origin);
    console.log('Auth client base URL:', getBaseURL());
    console.log('Environment variables:', {
      NEXT_PUBLIC_BETTER_AUTH_URL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
      NODE_ENV: process.env.NODE_ENV
    });
  }
  
  const origin = getCurrentOrigin();
  const redirectUrl = callbackUrl ?? origin;
  
  console.log(`Sign-in with Google, using redirect URL: ${redirectUrl}`);
  
  return signIn.social({
    provider: "google",
    callbackURL: redirectUrl
  });
}; 