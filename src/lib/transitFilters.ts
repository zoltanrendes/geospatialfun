import type { TransitCategory, TransitPlace } from "../types/transit";

export interface TransitFilters {
  search: string;
  category: TransitCategory | "";
  reference: string;
}

export const initialTransitFilters: TransitFilters = { search: "", category: "", reference: "" };

export function filterTransitPlaces(places: readonly TransitPlace[], filters: TransitFilters) {
  const search = filters.search.trim().toLowerCase();

  return places.filter((place) =>
    (!filters.category || place.category === filters.category) &&
    (!filters.reference || place.ref === filters.reference) &&
    (!search || [place.name, place.id, String(place.osmId)].some((value) =>
      value.toLowerCase().includes(search),
    )),
  );
}
