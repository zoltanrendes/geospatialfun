import { queryOptions, useQuery } from "@tanstack/react-query";
import { loadTransitPlaces } from "../lib/transitData";

// The dataset ships with the app, so ordinary UI updates need no revalidation.
export const transitPlacesQueryOptions = queryOptions({
  queryKey: ["transit-places"] as const,
  queryFn: ({ signal }) => loadTransitPlaces(signal),
  staleTime: Infinity,
});

// Use the shared query definition so every consumer reads the same cache entry.
export function useTransitPlaces() {
  return useQuery(transitPlacesQueryOptions);
}
