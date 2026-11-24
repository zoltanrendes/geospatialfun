import type { TransitPlace } from "../types/transit";
import { mapGeoJsonToTransitPlaces } from "./transitMapper";

// Forward cancellation so an abandoned query can stop reading the bundled asset.
export async function loadTransitPlaces(signal: AbortSignal): Promise<TransitPlace[]> {
  const response = await fetch("/data/herts-transit.geojson", { signal });

  if (!response.ok) {
    throw new Error(`Failed to load transit places (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  return mapGeoJsonToTransitPlaces(data);
}
