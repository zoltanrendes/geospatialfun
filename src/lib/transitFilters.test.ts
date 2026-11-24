import { expect, it } from "vitest";
import type { TransitPlace } from "../types/transit";
import { filterTransitPlaces, initialTransitFilters } from "./transitFilters";

const station: TransitPlace = {
  id: "station-1", osmId: 42, name: "Ware", category: "train_station",
  ref: "WAE", operator: null, position: { lat: 51.8, lng: 0 },
};
const stop: TransitPlace = {
  ...station, id: "stop-2", osmId: 123, name: "Ware Road", category: "bus_stop", ref: null,
};
const places = [station, stop];

it.each([" waRe ", "station-1", "42"])("matches a local search for %s", (search) => {
  expect(filterTransitPlaces(places, { ...initialTransitFilters, search })).toEqual(
    search.trim().toLowerCase() === "ware" ? places : [station],
  );
});

it("combines search, category and reference and resets to all places", () => {
  expect(filterTransitPlaces(places, { search: "ware", category: "train_station", reference: "WAE" })).toEqual([station]);
  expect(filterTransitPlaces(places, { search: "ware", category: "bus_stop", reference: "WAE" })).toEqual([]);
  expect(filterTransitPlaces(places, initialTransitFilters)).toEqual(places);
});
