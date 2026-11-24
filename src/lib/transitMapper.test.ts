import { describe, expect, it } from "vitest";
import type { RawTransitFeatureProperties } from "../types/transit";
import { mapFeatureToTransitPlace, mapGeoJsonToTransitPlaces } from "./transitMapper";

function point(coordinates: unknown, properties: RawTransitFeatureProperties = {}, id?: string) {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates },
    properties: { category: "bus_stop", osmId: 123, ...properties },
  };
}

describe("mapFeatureToTransitPlace", () => {
  it.each([[-180, 90], [-180, 90, -5]].map((coordinates) => ({ coordinates })))(
    "maps $coordinates to latitude and longitude",
    ({ coordinates }) => {
      expect(mapFeatureToTransitPlace(point(coordinates))?.position).toEqual({
        lat: 90,
        lng: -180,
      });
    },
  );

  it.each([
    { coordinates: [0] },
    { coordinates: [181, 0] },
    { coordinates: [0, 91] },
    { coordinates: [0, 51, "bad"] },
    { coordinates: [0, 51, null] },
    { coordinates: [0, 51, Infinity] },
    { coordinates: [0, 51, 5, 6] },
  ])("rejects invalid coordinates $coordinates", ({ coordinates }) => {
    expect(mapFeatureToTransitPlace(point(coordinates))).toBeNull();
  });

  it.each([undefined, 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid OSM ID %s even with a feature ID",
    (osmId) => {
      expect(mapFeatureToTransitPlace(point([0, 51], { osmId }, "feature-id"))).toBeNull();
    },
  );

  it.each([
    { propertyId: " place-id ", featureId: "feature-id", expectedId: "place-id" },
    { propertyId: " ", featureId: " feature-id ", expectedId: "feature-id" },
    { propertyId: " ", featureId: " ", expectedId: "osm-node-123" },
  ])("selects $expectedId from the available IDs", ({ propertyId, featureId, expectedId }) => {
    expect(mapFeatureToTransitPlace(point([0, 51], { id: propertyId }, featureId))?.id).toBe(expectedId);
  });
});

describe("mapGeoJsonToTransitPlaces", () => {
  it("filters invalid features from a collection", () => {
    const valid = point([0, 51]);
    const line = { ...valid, geometry: { type: "LineString", coordinates: [[0, 51], [1, 52]] } };
    const features = [null, line, point([0, 51, "bad"]), point([0, 51], { osmId: 0 }), valid];

    expect(mapGeoJsonToTransitPlaces({ type: "FeatureCollection", features })).toEqual([
      {
        id: "osm-node-123",
        osmId: 123,
        name: "Unnamed bus stop",
        category: "bus_stop",
        position: { lat: 51, lng: 0 },
        ref: null,
        operator: null,
      },
    ]);
  });

  it("rejects a collection without a features array", () => {
    expect(() => mapGeoJsonToTransitPlaces({ type: "FeatureCollection", features: null })).toThrow(
      "expected a FeatureCollection with features array",
    );
  });
});
