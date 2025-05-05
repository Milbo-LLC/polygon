"use client";

import { TRPCClientError } from "@trpc/client";
import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  type PropsWithChildren,
  useCallback
} from "react";
import { toast } from "sonner";
import { AUTH_REDIRECT_PATH_SIGNED_OUT } from "~/constants/links";
import { api } from "~/trpc/react";
import { useSession } from "~/server/auth/client";

interface ErrorWithCode {
  code: string;
}

function hasErrorCode(obj: unknown): obj is ErrorWithCode {
  return (
    typeof obj === 'object' && 
    obj !== null && 
    'code' in obj && 
    typeof (obj as ErrorWithCode).code === 'string'
  );
}

// Create context for error handling
const ApiErrorContext = createContext<{
  handleError: (error: unknown) => void;
}>({
  // This is just a placeholder that will be overridden by the provider
  handleError: (_: unknown) => undefined
});

export function ApiErrorProvider({ children }: PropsWithChildren) {
  const [hasShownError, setHasShownError] = useState(false);
  const utils = api.useUtils();
  const { data: session, isPending } = useSession();

  // Add a function to check auth status when initialized
  useEffect(() => {
    if (!isPending && !session) {
      console.log('No active session detected in ApiErrorProvider, redirecting immediately');
      window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
    }
  }, [session, isPending]);

  const handleError = useCallback((error: unknown) => {
    // Add detailed console logging
    console.log('API Error Handler received error:', error);
    
    if (error instanceof TRPCClientError) {
      const trpcError = error;
      
      // Safe way to log the error details without unsafe assignments
      console.log('TRPC Error message:', trpcError.message);
      if (trpcError.data) {
        console.log('TRPC Error data:', typeof trpcError.data);
      }
      
      const isUnauthorizedMessage = 
        trpcError.message.includes("UNAUTHORIZED") || 
        trpcError.message.includes("unauthorized");
      
      const isUnauthorizedCode = hasErrorCode(trpcError.data) && trpcError.data.code === "UNAUTHORIZED";
      
      if (isUnauthorizedMessage || isUnauthorizedCode) {
        if (!hasShownError) {
          setHasShownError(true);
          console.log("Authentication error detected, redirecting to login immediately");
          toast.error("Your session has expired. Please sign in again.");
          
          utils.invalidate().catch(console.error);
          
          // Use immediate redirect with window.location
          window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
          return;
        }
        return;
      }
      
      toast.error(trpcError.message || "An error occurred");
    } else if (error instanceof Error) {
      console.log('Standard Error:', error.message, error.stack);
      
      // Check if error message suggests auth issues
      if (error.message.includes("auth") || 
          error.message.includes("login") || 
          error.message.includes("unauthorized") ||
          error.message.includes("UNAUTHORIZED")) {
        window.location.href = AUTH_REDIRECT_PATH_SIGNED_OUT;
        return;
      }
      
      toast.error(error.message || "An error occurred");
    } else {
      console.log('Unknown error type:', error);
      toast.error("An unknown error occurred");
    }
  }, [hasShownError, utils]);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.log('Global error event caught:', event);
      handleError(event.error);
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.log('Unhandled promise rejection caught:', event);
      handleError(event.reason);
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [handleError]);

  return (
    <ApiErrorContext.Provider value={{ handleError }}>
      {children}
    </ApiErrorContext.Provider>
  );
}

// Custom hook to use the API error handler
export function useApiErrorHandler() {
  const context = useContext(ApiErrorContext);
  if (!context) {
    throw new Error("useApiErrorHandler must be used within an ApiErrorProvider");
  }
  return context;
} 