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

function fakeMaps() {
  const remove = vi.fn();
  const addListener = vi.fn((_event: string, _listener: (event: google.maps.Data.MouseEvent) => void) => ({ remove }));
  const layer = {
    add: vi.fn((options: google.maps.Data.FeatureOptions) => ({ getId: () => options.id })),
    addListener, setStyle: vi.fn<(style: google.maps.Data.StylingFunction) => void>(), remove: vi.fn(), setMap: vi.fn(),
  };
  const camera = { fitBounds: vi.fn(), panTo: vi.fn(), setZoom: vi.fn() };
  const createMap = vi.fn(function () { return camera; });
  const maps = {
    Map: createMap,
    Data: vi.fn(function () { return layer; }),
    LatLngBounds: vi.fn(function () { return { extend: vi.fn() }; }),
  } as unknown as typeof google.maps;
  return { maps, createMap, layer, remove, addListener, camera };
}

it("keeps one map, updates points and only moves the camera for intended actions", async () => {
  const fake = fakeMaps();
  vi.mocked(loadGoogleMaps).mockResolvedValue(fake.maps);
  const onSelect = vi.fn();
  const view = (visible: TransitPlace[], selectedId: string | null, overview: number) => (
    <StrictMode>
      <TransitMap apiKey="test-key" places={[station, stop]} visiblePlaces={visible}
        selectedId={selectedId} overview={overview} onSelect={onSelect} />
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
  const style = fake.layer.setStyle.mock.lastCall?.[0] as google.maps.Data.StylingFunction;
  const feature = (id: string) => ({ getId: () => id }) as google.maps.Data.Feature;
  expect(style(feature("station"))).toMatchObject({ visible: true, zIndex: 2 });
  expect(style(feature("stop"))).toMatchObject({ visible: false });
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
  const { unmount } = render(<TransitMap apiKey="test-key" places={[]} visiblePlaces={[]}
    selectedId={null} overview={0} onSelect={vi.fn()} />);
  unmount();
  await act(async () => resolveLoad(fake.maps));
  expect(fake.createMap).not.toHaveBeenCalled();
});
