import { signOut } from "next-auth/react";

export const useHandleSignout = () => {

  const handleSignout = async () => {
    localStorage.clear();
    await signOut();
  };

  return { handleSignout };
};