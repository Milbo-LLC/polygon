import { createAuthClient } from "better-auth/react";
import { env } from "~/env";

export const authClient = createAuthClient({
    baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL
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