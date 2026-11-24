import type { LatLngLiteral, TransitPlace } from "../types/transit";

export type MapPointKind = TransitPlace["category"] | "selected_bus_stop" | "selected_train_station" | "cluster";

export interface MapPoint {
  kind: MapPointKind;
  position: LatLngLiteral;
  title: string;
  members?: readonly TransitPlace[];
}

export const densePointThreshold = 200;
export const detailZoom = 16;

/**
 * Bound the number of drawn overlays while preserving every place in the results.
 *
 * @param places - Filtered places eligible for the point layer.
 * @param zoom - Integer zoom used to size the grouping grid.
 * @param selectedId - A selected place stays individually visible, even outside the viewport.
 * @param inView - Optional viewport predicate for all other places.
 * @returns Individual points and groups keyed for incremental updates.
 */
export function buildTransitMapPoints(
  places: readonly TransitPlace[],
  zoom: number,
  selectedId: string | null,
  inView?: (position: LatLngLiteral) => boolean,
) {
  const points = new Map<string, MapPoint>();
  const groups = new Map<string, TransitPlace[]>();
  const cluster = places.length > densePointThreshold && zoom < detailZoom;
  const cells = 256 * 2 ** zoom / 64;

  /**
   * Keep the place ID stable as zoom changes how it is represented.
   *
   * @param place - The place to show individually.
   * @returns No value. Adds the point to the current result.
   */
  function addPlace(place: TransitPlace) {
    points.set(place.id, {
      kind: place.id === selectedId ? `selected_${place.category}` : place.category,
      position: place.position,
      title: place.name,
    });
  }

  // Grid cells use projected pixels so groups split naturally as the user zooms in.
  for (const place of places) {
    if (place.id !== selectedId && inView && !inView(place.position)) continue;
    if (place.id === selectedId || !cluster) {
      addPlace(place);
    } else if (cluster) {
      const { lat, lng } = place.position;
      const sine = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
      const x = Math.floor((lng + 180) / 360 * cells);
      const y = Math.floor((0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * cells);
      const id = `cluster:${zoom}:${x}:${y}`;
      const group = groups.get(id);
      if (group) group.push(place);
      else groups.set(id, [place]);
    }
  }

  for (const [id, members] of groups) {
    const first = members[0];
    if (!first) continue;
    if (members.length === 1) {
      addPlace(first);
      continue;
    }
    let lat = 0;
    let lng = 0;
    for (const { position } of members) {
      lat += position.lat;
      lng += position.lng;
    }
    points.set(id, {
      kind: "cluster",
      position: { lat: lat / members.length, lng: lng / members.length },
      title: `${members.length} transit places. Select to zoom in.`,
      members,
    });
  }

  return points;
}
