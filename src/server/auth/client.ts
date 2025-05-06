import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

// Create the auth client with the appropriate base URL and disable automatic session
export const authClient = createAuthClient({ 
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  requestOptions: {
    credentials: 'include',
    mode: 'cors'
  },
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
