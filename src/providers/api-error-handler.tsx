"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const utils = api.useUtils();

  const handleError = useCallback((error: unknown) => {
    if (error instanceof TRPCClientError) {
      const trpcError = error;
      
      const isUnauthorizedMessage = 
        trpcError.message.includes("UNAUTHORIZED") || 
        trpcError.message.includes("unauthorized");
      
      const isUnauthorizedCode = hasErrorCode(trpcError.data) && trpcError.data.code === "UNAUTHORIZED";
      
      if (isUnauthorizedMessage || isUnauthorizedCode) {
        if (!hasShownError) {
          setHasShownError(true);
          console.log("Authentication error detected, redirecting to login", trpcError);
          toast.error("Your session has expired. Please sign in again.");
          
          // Clear all queries from cache to prevent further errors
          utils.invalidate().catch(console.error);
          
          // Redirect to login
          setTimeout(() => {
            void router.push(AUTH_REDIRECT_PATH_SIGNED_OUT);
          }, 500);
        }
        return;
      }
      
      // Handle other API errors
      toast.error(trpcError.message || "An error occurred");
    } else if (error instanceof Error) {
      toast.error(error.message || "An error occurred");
    } else {
      toast.error("An unknown error occurred");
    }
  }, [hasShownError, router, utils]);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      handleError(event.error);
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
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