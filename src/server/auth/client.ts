import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

// Function to get the base URL depending on the environment
const getBaseURL = () => {
  // In local dev, use localhost if needed
  if (typeof window !== 'undefined') {
    const currentHost = window.location.host;
    if (currentHost.startsWith('localhost')) {
      return window.location.origin;
    }
  }
  
  return env.NEXT_PUBLIC_BETTER_AUTH_URL;
};

// Get the current origin for use in requests
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Detect and handle the "please_restart_the_process" error
const handleAuthErrors = () => {
  if (typeof window !== 'undefined') {
    // Check URL params for error
    const urlParams = new URLSearchParams(window.location.search);
    const errorCode = urlParams.get('error');
    
    // Check if we're on the error page directly
    const isErrorPage = window.location.pathname === '/api/auth/error' || 
                      window.location.href.includes('error=please_restart_the_process');
    
    if (errorCode === 'please_restart_the_process' || isErrorPage) {
      // Get callback URL or default to projects
      const callbackUrl = urlParams.get('callbackUrl') ?? '/projects';
      
      console.log('Detected please_restart_the_process error, automatically retrying auth...');
      
      // Don't show the error page, redirect back to app immediately
      if (isErrorPage) {
        window.location.href = `${getCurrentOrigin()}/login`;
        return true;
      }
      
      // Otherwise retry from current page
      setTimeout(() => {
        void signInWithGoogle(callbackUrl);
      }, 100);
      
      return true;
    }
  }
  return false;
};

// Run error detection immediately on page load
if (typeof window !== 'undefined') {
  // Check as soon as possible
  handleAuthErrors();
  
  // Also check after a small delay in case the URL changes
  setTimeout(() => {
    void handleAuthErrors();
  }, 100);
}

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
