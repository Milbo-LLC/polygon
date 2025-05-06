import { signOut } from "~/server/auth/client";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";

export const useHandleSignout = () => {

  const handleSignout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      await signOut();
      
      setTimeout(() => {
        window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
      }, 100);
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
    }
  };

  return { handleSignout };
};