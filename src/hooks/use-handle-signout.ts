import { signOut } from "~/server/auth/client";

export const useHandleSignout = () => {

  const handleSignout = async () => {
    localStorage.clear();
    await signOut();
  };

  return { handleSignout };
};