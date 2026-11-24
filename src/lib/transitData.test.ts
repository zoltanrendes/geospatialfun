import { afterEach, expect, it, vi } from "vitest";
import { loadTransitPlaces } from "./transitData";

afterEach(() => vi.unstubAllGlobals());

/**
 * Keep the envelope valid while varying individual feature validity.
 *
 * @param features - The entries to place in the collection.
 * @returns A valid collection envelope for the fixtures.
 */
const collection = (features: unknown[]) => ({ type: "FeatureCollection", features });
/**
 * Allow unsupported categories and invalid coordinates to reach validation.
 *
 * @param category - The raw category under test.
 * @param osmId - The fixture's OSM identifier.
 * @param coordinates - The raw coordinates, which may be invalid.
 * @returns A raw point feature for the loader.
 */
const feature = (category: string, osmId: number, coordinates: unknown) => ({
  type: "Feature",
  properties: { category, osmId },
  geometry: { type: "Point", coordinates },
});

it("fetches the bundled asset with the supplied signal", async () => {
  const signal = new AbortController().signal;
  const fetch = vi.fn().mockResolvedValue(Response.json(collection([])));
  vi.stubGlobal("fetch", fetch);

  await expect(loadTransitPlaces(signal)).resolves.toEqual([]);
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/data/herts-transit.geojson", { signal });
});

it("propagates cancellation from fetch", async () => {
  const controller = new AbortController();
  vi.stubGlobal("fetch", (_url: string, { signal }: { signal: AbortSignal }) =>
    new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  );

  const result = loadTransitPlaces(controller.signal);
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: "AbortError" });
});

it("reports the HTTP status before parsing the response", async () => {
  const response = new Response("Not found", { status: 404 });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

  await expect(loadTransitPlaces(new AbortController().signal)).rejects.toThrow("404");
  expect(response.bodyUsed).toBe(false);
});

it("propagates network failures", async () => {
  const error = new TypeError("Failed to fetch");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));

  await expect(loadTransitPlaces(new AbortController().signal)).rejects.toBe(error);
});

it("rejects malformed JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{")));

  await expect(loadTransitPlaces(new AbortController().signal)).rejects.toBeInstanceOf(SyntaxError);
});

it("rejects an invalid feature collection", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ type: "FeatureCollection" })));

  await expect(loadTransitPlaces(new AbortController().signal)).rejects.toThrow("FeatureCollection");
});

it("maps supported points and filters invalid features", async () => {
  const features = [
    feature("train_station", 1, [-0.5, 51.5]),
    null,
    feature("bus_stop", 2, [0.5, 52]),
    feature("tram_stop", 3, [0, 51]),
    feature("bus_stop", 4, [0, 91]),
  ];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(collection(features))));

  await expect(loadTransitPlaces(new AbortController().signal)).resolves.toMatchObject([
    { category: "train_station", position: { lat: 51.5, lng: -0.5 } },
    { category: "bus_stop", position: { lat: 52, lng: 0.5 } },
  ]);
});
