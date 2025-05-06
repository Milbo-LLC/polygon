"use client";

import { TRPCClientError } from "@trpc/client";
import { createContext, useContext, useState, useEffect, type PropsWithChildren, useCallback } from "react";
import { toast } from "sonner";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { api } from "~/trpc/react";
import { useSession } from "~/server/auth/client";

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
    // Check if already on auth route
    const pathname = window.location.pathname;
    const isAuthRoute = pathname === '/login' || 
                       pathname === AUTH_REDIRECT_PATH_SIGNED_OUT ||
                       pathname.startsWith('/signup') ||
                       pathname.startsWith('/api/auth');
    
    // Only redirect if not on an auth route
    if (!isPending && !session && !isAuthRoute) {
      // Prevent infinite loop
      const alreadyRedirected = window.location.href.includes("authRedirect=1");
      if (!alreadyRedirected) {
        console.log('ApiErrorProvider: No session detected, redirecting...');
        const separator = AUTH_REDIRECT_PATH_SIGNED_OUT.includes("?") ? "&" : "?";
        window.location.href = `${AUTH_REDIRECT_PATH_SIGNED_OUT}${separator}authRedirect=1`;
      } else {
        console.error("Authentication failed or cookies are blocked. Stopping further redirects in ApiErrorProvider.");
      }
    }
  }, [session, isPending]);

  const handleError = useCallback((error: unknown) => {
    console.log('API Error Handler received error:', error);

    if (error instanceof TRPCClientError) {
      const isUnauthorized = error.message.includes("UNAUTHORIZED");
      if (isUnauthorized && !hasShownError) {
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
