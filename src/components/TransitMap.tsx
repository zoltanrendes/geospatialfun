import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadGoogleMaps, subscribeToMapsFailure } from "../lib/googleMaps";
import type { TransitPlace } from "../types/transit";

interface TransitMapProps {
  apiKey: string;
  places: readonly TransitPlace[];
  visiblePlaces: readonly TransitPlace[];
  selectedId: string | null;
  overview: number;
  onSelect: (id: string) => void;
  onOverview?: () => void;
}

interface MapSession {
  maps: typeof google.maps;
  map: google.maps.Map;
  layer: google.maps.Data;
  features: Map<string, google.maps.Data.Feature>;
  framed: boolean;
  selectedId: string | null;
  overview: number;
}

function focus({ map }: MapSession, place: TransitPlace) {
  map.panTo(place.position);
  map.setZoom(16);
}

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

export function TransitMap({ apiKey, places, visiblePlaces, selectedId, overview, onSelect, onOverview }: TransitMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const selectionHandler = useRef(onSelect);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [session, setSession] = useState<MapSession | null>(null);
  const [failed, setFailed] = useState(false);
  const configured = apiKey.trim() !== "";

  useLayoutEffect(() => { selectionHandler.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const element = host.current;
    if (!configured || !element) return;

    let active = true;
    let ownedSession: MapSession | undefined;
    let click: google.maps.MapsEventListener | undefined;

    function releaseLayer() {
      click?.remove();
      click = undefined;
      if (ownedSession) {
        const { layer, features } = ownedSession;
        features.forEach((feature) => layer.remove(feature));
        features.clear();
        layer.setMap(null);
        ownedSession = undefined;
      }
    }

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
      click = layer.addListener("click", (event: google.maps.Data.MouseEvent) => {
        const id = event.feature.getId();
        if (typeof id === "string") selectionHandler.current(id);
      });
      ownedSession = { maps, map, layer, features: new Map(), framed: false, selectedId: null, overview: 0 };
      setSession(ownedSession);
    }).catch(fail);

    return () => {
      active = false;
      unsubscribe();
      releaseLayer();
    };
  }, [apiKey, configured]);

  useEffect(() => {
    if (!session) return;
    const { layer, features } = session;
    const byId = new Map(places.map((place) => [place.id, place]));
    const visibleIds = new Set(visiblePlaces.map(({ id }) => id));

    features.forEach((feature, id) => {
      if (byId.has(id)) return;
      layer.remove(feature);
      features.delete(id);
    });
    byId.forEach((place, id) => {
      if (!features.has(id)) features.set(id, layer.add({ id, geometry: place.position }));
    });
    layer.setStyle((feature) => {
      const id = feature.getId();
      const place = typeof id === "string" ? byId.get(id) : undefined;
      if (!place || !visibleIds.has(place.id)) return { visible: false };
      const selected = place.id === selectedId;
      const station = place.category === "train_station";
      return {
        title: place.name,
        visible: true,
        zIndex: selected ? 2 : station ? 1 : 0,
        icon: {
          path: station ? "M -5,-5 H 5 V 5 H -5 Z" : "M -5,0 A 5,5 0 1,0 5,0 A 5,5 0 1,0 -5,0",
          fillColor: selected ? "#a83a1d" : station ? "#304298" : "#006658",
          fillOpacity: 1,
          scale: selected ? 1.65 : 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
        },
      };
    });
  }, [session, places, visiblePlaces, selectedId]);

  useEffect(() => {
    if (!session) return;
    const selected = visiblePlaces.find(({ id }) => id === selectedId);
    if (session.overview !== overview) {
      frame(session, visiblePlaces);
      session.framed ||= visiblePlaces.length > 0;
    } else if (selected && session.selectedId !== selectedId) {
      focus(session, selected);
      session.framed = true;
    } else if (!session.framed && visiblePlaces.length > 0) {
      frame(session, visiblePlaces);
      session.framed = true;
    }
    session.selectedId = selectedId;
    session.overview = overview;
  }, [session, visiblePlaces, selectedId, overview]);

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
