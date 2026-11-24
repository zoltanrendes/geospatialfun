import { queryOptions, useQuery } from "@tanstack/react-query";
import { loadTransitPlaces } from "../lib/transitData";

export const transitPlacesQueryOptions = queryOptions({
  queryKey: ["transit-places"] as const,
  queryFn: ({ signal }) => loadTransitPlaces(signal),
  staleTime: Infinity,
});

export function useTransitPlaces() {
  return useQuery(transitPlacesQueryOptions);
}
