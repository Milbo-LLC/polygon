"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useMemo } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";
import { useSession } from "~/server/auth/client";
import { type SessionUser } from "~/types/auth";
import { useApiErrorHandler } from "~/providers/api-error-handler";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { data: session } = useSession();
  const { handleError } = useApiErrorHandler();
  
  const user = session?.user as SessionUser | undefined;
  const activeOrganizationId = user?.activeOrganizationId;

  const trpcClient = useMemo(() => 
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            
            // Set organization ID in the header if available
            if (activeOrganizationId) {
              headers.set("x-organization-id", activeOrganizationId);
            }
            
            return headers;
          },
          // Handle any HTTP errors
          AbortController: typeof window !== 'undefined' ? window.AbortController : undefined,
        }),
      ],
    }),
  [activeOrganizationId]);

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient} onError={handleError}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
