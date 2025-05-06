"use client";

import { TRPCClientError } from "@trpc/client";
import { createContext, useContext, useState, useEffect, type PropsWithChildren, useCallback } from "react";
import { toast } from "sonner";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { api } from "~/trpc/react";
import { useSession } from "~/server/auth/client";

const isPREnvironment = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return host.includes('polygon-polygon-pr-') || host.includes('polygon-pr-');
  }
  return false;
};

const ApiErrorContext = createContext<{
  handleError: (error: unknown) => void;
}>({
  handleError: () => undefined
});

export function ApiErrorProvider({ children }: PropsWithChildren) {
  const [hasShownError, setHasShownError] = useState(false);
  const utils = api.useUtils();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session && !isPREnvironment()) {
      console.log('ApiErrorProvider: No session detected, redirecting...');
      window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
    }
  }, [session, isPending]);

  const handleError = useCallback((error: unknown) => {
    console.log('API Error Handler received error:', error);

    if (error instanceof TRPCClientError) {
      const isUnauthorized = error.message.includes("UNAUTHORIZED");
      if (isUnauthorized && !hasShownError && !isPREnvironment()) {
        setHasShownError(true);
        toast.error("Your session expired. Please sign in again.");
        utils.invalidate().catch(console.error);
        window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
        return;
      }
      toast.error(error.message || "An error occurred");
    } else if (error instanceof Error) {
      toast.error(error.message || "An error occurred");
    } else {
      toast.error("An unknown error occurred");
    }
  }, [hasShownError, utils]);

  return (
    <ApiErrorContext.Provider value={{ handleError }}>
      {children}
    </ApiErrorContext.Provider>
  );
}

export function useApiErrorHandler() {
  return useContext(ApiErrorContext);
}
