"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useMemo } from "react";
import SuperJSON from "superjson";
import { useAtom } from "jotai";

import { type AppRouter } from "~/server/api/root";
import { createQueryClient } from "./query-client";
import { activeOrganizationIdAtom } from "~/app/(protected)/atoms";

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
  const [activeOrganizationId] = useAtom(activeOrganizationIdAtom);

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
            
            // Always set organization ID to user ID if we're authenticated but no org ID is set
            if (activeOrganizationId) {
              headers.set("x-organization-id", activeOrganizationId);
              console.log("Setting x-organization-id header:", activeOrganizationId);
            } else if (typeof window !== 'undefined') {
              // Get user ID from session if available
              try {
                const session = JSON.parse(localStorage.getItem('next-auth.session-token') || '{}');
                if (session?.user?.id) {
                  headers.set("x-organization-id", session.user.id);
                  console.log("Falling back to user ID for x-organization-id:", session.user.id);
                }
              } catch (e) {
                console.error("Failed to parse session from localStorage", e);
              }
            }
            
            return headers;
          },
        }),
      ],
    }),
  [activeOrganizationId]);

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
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
