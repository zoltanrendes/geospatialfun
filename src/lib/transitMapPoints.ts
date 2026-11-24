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

  function addPlace(place: TransitPlace) {
    points.set(place.id, {
      kind: place.id === selectedId ? `selected_${place.category}` : place.category,
      position: place.position,
      title: place.name,
    });
  }

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
