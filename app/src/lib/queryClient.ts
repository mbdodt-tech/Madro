import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Offline: intet retry (retries PAUSES i offlineFirst-mode og ville
      // ellers lade skeleton hænge) — fejl ærligt, ErrorState har "Prøv igen".
      retry: (failureCount) => failureCount < 1 && navigator.onLine,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 'online' (default) PAUSER queries offline → evig skeleton.
      networkMode: "offlineFirst",
    },
  },
});
