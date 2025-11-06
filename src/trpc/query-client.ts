import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 60 seconds - data stays fresh longer
        // Disable window focus refetching to prevent infinite loops
        // but keep mount refetching so data loads on first render
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Allow mount refetch, but with staleTime it won't refetch if data is fresh
        refetchOnMount: true,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ??
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
