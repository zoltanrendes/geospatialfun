import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadGoogleMaps, subscribeToMapsFailure } from "../lib/googleMaps";
import { buildTransitMapPoints, densePointThreshold, detailZoom } from "../lib/transitMapPoints";
import type { MapPoint, MapPointKind } from "../lib/transitMapPoints";
import type { TransitPlace } from "../types/transit";

interface TransitMapProps {
  apiKey: string;
  visiblePlaces: readonly TransitPlace[];
  selectedId: string | null;
  focusRequest: number;
  overview: number;
  onSelect: (id: string) => void;
  onOverview?: () => void;
}

interface MapSession {
  maps: typeof google.maps;
  map: google.maps.Map;
  layer: google.maps.Data;
  features: Map<string, { feature: google.maps.Data.Feature; point: MapPoint }>;
  framed: boolean;
  focusRequest: number;
  overview: number;
}

const circle = "M -5,0 A 5,5 0 1,0 5,0 A 5,5 0 1,0 -5,0";
const square = "M -5,-5 H 5 V 5 H -5 Z";

// Share icon definitions so style callbacks need no per-feature icon allocation.
function pointStyle(path: string, fillColor: string, scale: number, zIndex: number): google.maps.Data.StyleOptions {
  return { zIndex, icon: { path, fillColor, scale, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 1.5 } };
}

const pointStyles: Record<MapPointKind, google.maps.Data.StyleOptions> = {
  bus_stop: pointStyle(circle, "#006658", 1, 0),
  train_station: pointStyle(square, "#304298", 1, 1),
  selected_bus_stop: pointStyle(circle, "#a83a1d", 1.65, 3),
  selected_train_station: pointStyle(square, "#a83a1d", 1.65, 3),
  cluster: pointStyle(circle, "#164d46", 2.2, 2),
};

// Preserve existing features to avoid forcing Maps to redraw unchanged overlays.
function renderPoints(session: MapSession, points: ReadonlyMap<string, MapPoint>) {
  const { features, layer } = session;
  features.forEach(({ feature }, id) => {
    if (points.has(id)) return;
    layer.remove(feature);
    features.delete(id);
  });
  points.forEach((point, id) => {
    const existing = features.get(id);
    if (!existing) {
      const style = { ...pointStyles[point.kind], title: point.title };
      const feature = layer.add({ id, geometry: point.position, properties: { style } });
      features.set(id, { feature, point });
      return;
    }

    const { feature, point: previous } = existing;
    if (previous.position.lat !== point.position.lat || previous.position.lng !== point.position.lng) {
      feature.setGeometry(point.position);
    }
    if (previous.kind !== point.kind || previous.title !== point.title) {
      feature.setProperty("style", { ...pointStyles[point.kind], title: point.title });
    }
    existing.point = point;
  });
}

// Use a predictable detail zoom for both selections and single-point overviews.
function focus({ map }: MapSession, place: TransitPlace) {
  map.panTo(place.position);
  map.setZoom(detailZoom);
}

// Coincident positions need the same bounded zoom as a single place.
function frame(session: MapSession, places: readonly TransitPlace[]) {
  const first = places[0];
  if (!first) return;
  if (places.every(({ position }) => position.lat === first.position.lat && position.lng === first.position.lng)) {
    focus(session, first);
    return;
  }
  const bounds = new session.maps.LatLngBounds();
  places.forEach(({ position }) => bounds.extend(position));
  session.map.fitBounds(bounds, 56);
}

export function TransitMap({ apiKey, visiblePlaces, selectedId, focusRequest, overview, onSelect, onOverview }: TransitMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const selectionHandler = useRef(onSelect);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [session, setSession] = useState<MapSession | null>(null);
  const [failed, setFailed] = useState(false);
  const configured = apiKey.trim() !== "";

  // Let the long-lived Maps listener call the latest React selection handler.
  useLayoutEffect(() => { selectionHandler.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const element = host.current;
    if (!configured || !element) return;

    let active = true;
    let ownedSession: MapSession | undefined;
    let click: google.maps.MapsEventListener | undefined;

    // Remove only the overlays and listener owned by this view.
    function releaseLayer() {
      click?.remove();
      click = undefined;
      if (ownedSession) {
        const { layer, features } = ownedSession;
        features.forEach(({ feature }) => layer.remove(feature));
        features.clear();
        layer.setMap(null);
        ownedSession = undefined;
      }
    }

    // Tear down overlays even if authentication fails after initialisation.
    function fail() {
      if (!active) return;
      active = false;
      releaseLayer();
      setSession(null);
      setFailed(true);
    }

    const unsubscribe = subscribeToMapsFailure(fail);
    // A deferred continuation lets Strict Mode dispose the first effect before construction.
    void loadGoogleMaps(apiKey).then((maps) => {
      if (!active) return;
      const map = mapRef.current ??= new maps.Map(element, {
        center: { lat: 51.82, lng: -0.23 },
        zoom: 10,
        streetViewControl: false,
        mapTypeControl: false,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
      if (!active) return;
      const layer = new maps.Data({ map });
      layer.setStyle((feature) => feature.getProperty("style") as google.maps.Data.StyleOptions);
      const currentSession: MapSession = { maps, map, layer, features: new Map(), framed: false, focusRequest: 0, overview: 0 };
      click = layer.addListener("click", (event: google.maps.Data.MouseEvent) => {
        const id = event.feature.getId();
        if (typeof id !== "string") return;
        const point = currentSession.features.get(id)?.point;
        if (point?.members) frame(currentSession, point.members);
        else if (point) selectionHandler.current(id);
      });
      ownedSession = currentSession;
      setSession(currentSession);
    }).catch(fail);

    return () => {
      active = false;
      unsubscribe();
      releaseLayer();
    };
  }, [apiKey, configured]);

  useEffect(() => {
    if (!session) return;
    const { map } = session;
    const dense = visiblePlaces.length > densePointThreshold;
    let previousView: string | undefined;

    // Skip repeated idle events when the zoom and relevant viewport are unchanged.
    function updatePoints() {
      if (!session) return;
      const zoom = dense ? Math.floor(map.getZoom() ?? 10) : 10;
      const bounds = dense && zoom >= 13 ? map.getBounds() : undefined;
      const view = dense ? `${zoom}:${bounds?.toUrlValue() ?? ""}` : "";
      if (previousView === view) return;
      previousView = view;
      renderPoints(session, buildTransitMapPoints(visiblePlaces, zoom, selectedId,
        bounds ? (position) => bounds.contains(position) : undefined));
    }

    updatePoints();
    if (!dense) return;
    const idle = map.addListener("idle", updatePoints);
    return () => idle.remove();
  }, [session, visiblePlaces, selectedId]);

  useEffect(() => {
    if (!session) return;
    const selected = visiblePlaces.find(({ id }) => id === selectedId);
    // Explicit camera requests take precedence over the one-off initial framing.
    if (session.overview !== overview) {
      frame(session, visiblePlaces);
      session.framed ||= visiblePlaces.length > 0;
    } else if (selected && session.focusRequest !== focusRequest) {
      focus(session, selected);
      session.framed = true;
    } else if (!session.framed && visiblePlaces.length > 0) {
      frame(session, visiblePlaces);
      session.framed = true;
    }
    session.focusRequest = focusRequest;
    session.overview = overview;
  }, [session, visiblePlaces, selectedId, focusRequest, overview]);

  return (
    <div className="transit-map">
      <div ref={host} className="transit-map__canvas" aria-label="Hertfordshire transit map"
        hidden={!configured || failed} />
      {(!configured || failed) && (
        <div className="transit-map__status" role="status">
          <strong>Map unavailable</strong>
          <span>{configured ? "Google Maps could not be loaded. Browse places in the results panel."
            : "A Google Maps key is needed to display the map. Browse places in the results panel."}</span>
        </div>
      )}
      {configured && !failed && !session && (
        <div className="transit-map__status" role="status">Loading map…</div>
      )}
      {session && onOverview && (
        <button className="transit-map__overview" type="button" onClick={onOverview}
          disabled={visiblePlaces.length === 0}>Map overview</button>
      )}
    </div>
  );
}
