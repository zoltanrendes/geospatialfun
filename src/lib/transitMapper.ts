import type {
  RawTransitFeature,
  RawTransitFeatureCollection,
  TransitCategory,
  TransitPlace,
} from "../types/transit";

// Keep unsupported transport types out of the filters and marker styles.
function isValidCategory(value: unknown): value is TransitCategory {
  return value === "train_station" || value === "bus_stop";
}

// Validate the full GeoJSON position before discarding elevation for the map.
function isValidCoordinates(
  coords: unknown,
): coords is [number, number] | [number, number, number] {
  if (!Array.isArray(coords) || (coords.length !== 2 && coords.length !== 3)) {
    return false;
  }

  const [lng, lat, elevation] = coords;
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    (coords.length === 2 ||
      (typeof elevation === "number" && Number.isFinite(elevation)))
  );
}

// Reject unusable features before they reach the list and point layer.
export function mapFeatureToTransitPlace(
  feature: RawTransitFeature,
): TransitPlace | null {
  if (!feature || feature.type !== "Feature") return null;
  if (!feature.geometry || feature.geometry.type !== "Point") return null;
  if (!isValidCoordinates(feature.geometry.coordinates)) return null;

  const props = feature.properties ?? {};
  if (!isValidCategory(props.category)) return null;

  const [lng, lat] = feature.geometry.coordinates;
  const { osmId } = props;
  // A missing or unsafe OSM ID cannot provide a reliable fallback identity.
  if (typeof osmId !== "number" || !Number.isSafeInteger(osmId) || osmId <= 0) {
    return null;
  }

  const propertyId = typeof props.id === "string" ? props.id.trim() : "";
  const featureId = typeof feature.id === "string" ? feature.id.trim() : "";
  const id = propertyId || featureId || `osm-node-${osmId}`;

  const name =
    typeof props.name === "string" && props.name.trim().length > 0
      ? props.name.trim()
      : props.category === "train_station"
        ? "Unnamed train station"
        : "Unnamed bus stop";

  return {
    id,
    osmId,
    name,
    category: props.category,
    position: { lat, lng },
    ref:
      typeof props.ref === "string" && props.ref.length > 0 ? props.ref : null,
    operator:
      typeof props.operator === "string" && props.operator.length > 0
        ? props.operator
        : null,
  };
}

// Fail the load for a broken envelope, but keep valid features in a usable collection.
export function mapGeoJsonToTransitPlaces(data: unknown): TransitPlace[] {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid GeoJSON payload: expected an object.");
  }

  const collection = data as RawTransitFeatureCollection;
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error(
      "Invalid GeoJSON payload: expected a FeatureCollection with features array.",
    );
  }

  const places: TransitPlace[] = [];
  for (const rawFeature of collection.features) {
    const mapped = mapFeatureToTransitPlace(rawFeature as RawTransitFeature);
    if (mapped) {
      places.push(mapped);
    }
  }
  return places;
}
