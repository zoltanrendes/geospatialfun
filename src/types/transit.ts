export type TransitCategory = "train_station" | "bus_stop";

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface TransitPlace {
  id: string;
  osmId: number;
  name: string;
  category: TransitCategory;
  position: LatLngLiteral;
  ref: string | null;
  operator: string | null;
}

export interface RawTransitFeatureProperties {
  id?: unknown;
  osmId?: unknown;
  name?: unknown;
  category?: unknown;
  ref?: unknown;
  operator?: unknown;
}

export interface RawTransitFeature {
  type?: unknown;
  id?: unknown;
  properties?: RawTransitFeatureProperties | null;
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  } | null;
}

export interface RawTransitFeatureCollection {
  type?: unknown;
  features?: unknown;
}
