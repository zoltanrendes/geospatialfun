// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { TransitPlace } from "../types/transit";
import { loadGoogleMaps } from "../lib/googleMaps";
import { TransitMap } from "./TransitMap";

vi.mock("../lib/googleMaps", () => ({
  loadGoogleMaps: vi.fn(),
  subscribeToMapsFailure: () => () => {},
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const station: TransitPlace = {
  id: "station", osmId: 1, name: "Ware", category: "train_station",
  position: { lat: 51.8, lng: 0 }, ref: null, operator: null,
};
const stop: TransitPlace = {
  ...station, id: "stop", osmId: 2, category: "bus_stop", position: { lat: 52, lng: 0 },
};

/**
 * Observe map and layer operations without loading the Google script.
 *
 * @returns Fake Maps constructors and spies for lifecycle assertions.
 */
function fakeMaps() {
  const remove = vi.fn();
  const addListener = vi.fn((_event: string, _listener: (event: google.maps.Data.MouseEvent) => void) => ({ remove }));
  const layer = {
    add: vi.fn((options: google.maps.Data.FeatureOptions) => ({
      getId: () => options.id,
      setProperty: vi.fn(),
      setGeometry: vi.fn(),
    })),
    addListener, setStyle: vi.fn<(style: google.maps.Data.StylingFunction) => void>(), remove: vi.fn(), setMap: vi.fn(),
  };
  const idleRemove = vi.fn();
  const camera = {
    fitBounds: vi.fn(), panTo: vi.fn(), setZoom: vi.fn(), getZoom: vi.fn(() => 10),
    getBounds: vi.fn<() => Pick<google.maps.LatLngBounds, "contains" | "toUrlValue"> | undefined>(),
    addListener: vi.fn((_event: string, _callback: () => void) => ({ remove: idleRemove })),
  };
  const createMap = vi.fn(function () { return camera; });
  const maps = {
    Map: createMap,
    Data: vi.fn(function () { return layer; }),
    LatLngBounds: vi.fn(function () { return { extend: vi.fn() }; }),
  } as unknown as typeof google.maps;
  return { maps, createMap, layer, remove, addListener, camera, idleRemove };
}

it("renders dense results as clusters until a settled zoom reveals individual points", async () => {
  const fake = fakeMaps();
  vi.mocked(loadGoogleMaps).mockResolvedValue(fake.maps);
  const places = Array.from({ length: 300 }, (_, index) => ({
    ...station, id: String(index), position: { lat: 51.8 + index / 100_000, lng: -0.2 },
  }));
  const onSelect = vi.fn();
  const { unmount } = render(<TransitMap apiKey="test-key" visiblePlaces={places}
    selectedId={null} focusRequest={0} overview={0} onSelect={onSelect} />);

  await waitFor(() => expect(fake.layer.add).toHaveBeenCalled());
  const clusterCount = fake.layer.add.mock.calls.length;
  expect(clusterCount).toBeLessThan(10);
  const cluster = fake.layer.add.mock.results[0]?.value;
  const click = fake.addListener.mock.calls[0]?.[1];
  click?.({ feature: cluster } as google.maps.Data.MouseEvent);
  expect(fake.camera.fitBounds).toHaveBeenCalledTimes(2);
  expect(onSelect).not.toHaveBeenCalled();

  const idle = fake.camera.addListener.mock.calls[0]?.[1];
  idle?.();
  expect(fake.layer.add).toHaveBeenCalledTimes(clusterCount);
  expect(fake.layer.remove).not.toHaveBeenCalled();

  fake.camera.getZoom.mockReturnValue(16);
  fake.camera.getBounds.mockReturnValue({ contains: ({ lat }) => typeof lat === "number" && lat > 51.8029,
    toUrlValue: () => "detail viewport" });
  idle?.();
  expect(fake.layer.remove).toHaveBeenCalledTimes(clusterCount);
  expect(fake.layer.add).toHaveBeenCalledTimes(clusterCount + 9);
  expect(fake.createMap).toHaveBeenCalledTimes(1);
  unmount();
  expect(fake.idleRemove).toHaveBeenCalledTimes(1);
});

it("keeps one map, updates points and only moves the camera for intended actions", async () => {
  const fake = fakeMaps();
  vi.mocked(loadGoogleMaps).mockResolvedValue(fake.maps);
  const onSelect = vi.fn();
  /**
   * Replay state changes under Strict Mode while retaining the same mounted map.
   *
   * @param visible - The currently visible places.
   * @param selectedId - The active place ID, if any.
   * @param overview - The overview request counter.
   * @returns The next render of the same Strict Mode test view.
   */
  const view = (visible: TransitPlace[], selectedId: string | null, overview: number) => (
    <StrictMode>
      <TransitMap apiKey="test-key" visiblePlaces={visible}
        selectedId={selectedId} focusRequest={selectedId ? 1 : 0} overview={overview} onSelect={onSelect} />
    </StrictMode>
  );
  const { rerender, unmount } = render(view([station, stop], null, 0));
  await waitFor(() => expect(fake.camera.fitBounds).toHaveBeenCalledTimes(1));
  expect(fake.createMap).toHaveBeenCalledTimes(1);
  expect(fake.createMap).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
    streetViewControl: false,
  }));
  expect(fake.layer.add).toHaveBeenCalledTimes(2);

  const click = fake.addListener.mock.calls[0]?.[1];
  click?.({ feature: { getId: () => "station" } } as google.maps.Data.MouseEvent);
  expect(onSelect).toHaveBeenCalledWith("station");

  rerender(view([station], "station", 0));
  expect(fake.camera.panTo).toHaveBeenCalledExactlyOnceWith(station.position);
  const stationFeature = fake.layer.add.mock.results[0]?.value;
  const stopFeature = fake.layer.add.mock.results[1]?.value;
  expect(stationFeature?.setProperty).toHaveBeenCalledExactlyOnceWith("style", expect.objectContaining({ zIndex: 3 }));
  expect(fake.layer.remove).toHaveBeenCalledWith(stopFeature);
  expect(fake.layer.setStyle).toHaveBeenCalledTimes(1);
  rerender(view([station], "station", 0));
  expect(fake.camera.panTo).toHaveBeenCalledTimes(1);
  rerender(view([station], "station", 1));
  expect(fake.camera.panTo).toHaveBeenCalledTimes(2);
  rerender(view([], null, 2));
  expect(fake.camera.fitBounds).toHaveBeenCalledTimes(1);
  expect(fake.camera.panTo).toHaveBeenCalledTimes(2);
  expect(fake.layer.add).toHaveBeenCalledTimes(2);
  expect(fake.createMap).toHaveBeenCalledTimes(1);
  unmount();
  expect(fake.remove).toHaveBeenCalledTimes(1);
  expect(fake.layer.setMap).toHaveBeenCalledWith(null);
});

it("ignores an outstanding load when the view unmounts", async () => {
  const fake = fakeMaps();
  let resolveLoad: (maps: typeof google.maps) => void = () => {};
  vi.mocked(loadGoogleMaps).mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
  const { unmount } = render(<TransitMap apiKey="test-key" visiblePlaces={[]}
    selectedId={null} focusRequest={0} overview={0} onSelect={vi.fn()} />);
  unmount();
  await act(async () => resolveLoad(fake.maps));
  expect(fake.createMap).not.toHaveBeenCalled();
});
