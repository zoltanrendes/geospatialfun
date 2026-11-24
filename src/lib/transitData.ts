import type { TransitPlace } from "../types/transit";
import { mapGeoJsonToTransitPlaces } from "./transitMapper";

/**
 * Load the bundled asset and preserve HTTP failures for the query's error state.
 *
 * @param signal - The query's cancellation signal for the request and response body.
 * @returns The validated places from the bundled response.
 */
export async function loadTransitPlaces(signal: AbortSignal): Promise<TransitPlace[]> {
  const response = await fetch("/data/herts-transit.geojson", { signal });

  if (!response.ok) {
    throw new Error(`Failed to load transit places (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  return mapGeoJsonToTransitPlaces(data);
}
