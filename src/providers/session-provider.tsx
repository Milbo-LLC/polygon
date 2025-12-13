"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "~/server/auth/client";
import { type Session } from "~/types/auth";

interface SessionContextValue {
  session: Session | null;
  isPending: boolean;
  error: Error | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  // Use React Query directly with our own configuration
  const { data, isPending, error } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const response = await authClient.getSession();
      return response.data;
    },
    // Disable all automatic refetching
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry once on failure
    retry: 1,
  });

  return (
    <SessionContext.Provider value={{ session: (data as Session) ?? null, isPending, error: error ?? null }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
