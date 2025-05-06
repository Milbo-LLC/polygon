import { signOut } from "~/server/auth/client";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";

export const useHandleSignout = () => {

  const handleSignout = async () => {
    try {
      // Clear all browser storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Remove auth cookie manually to ensure clean state
      document.cookie = "__Secure-better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax;";
      
      // Call the actual sign out function
      await signOut();
      
      // Redirect after a small delay to ensure all cleanup is completed
      setTimeout(() => {
        // Use a hard redirect to ensure the page fully reloads
        window.location.replace(AUTH_REDIRECT_PATH_SIGNED_OUT);
      }, 200);
    } catch (error) {
      console.error("Error during sign out:", error);
      // Even if there's an error, try to redirect to login
      window.location.replace(AUTH_REDIRECT_PATH_SIGNED_OUT);
    }
  };

  return { handleSignout };
};