// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { loadGoogleMaps } from "../lib/googleMaps";
import { TransitExplorer } from "./TransitExplorer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("shares a single bootstrap and map across retries and repeated interactions", async () => {
  let dataAvailable = false;
  const fetch = vi.fn(async (_url: string) => {
    if (!dataAvailable) throw new TypeError("Unavailable");
    return Response.json({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { osmId: 1, name: "Ware Station", category: "train_station" },
          geometry: { type: "Point", coordinates: [-0.2, 51.8] } },
        { type: "Feature", properties: { osmId: 2, name: "Ware Road", category: "bus_stop" },
          geometry: { type: "Point", coordinates: [-0.1, 51.81] } },
      ],
    });
  });
  vi.stubGlobal("fetch", fetch);
  const camera = { fitBounds: vi.fn(), panTo: vi.fn(), setZoom: vi.fn() };
  const constructMap = vi.fn(function () { return camera; });
  let selectMarker: ((event: { feature: { getId: () => string } }) => void) | undefined;
  const layer = {
    add: vi.fn((options: { id: string }) => ({ getId: () => options.id })),
    addListener: vi.fn((_event, listener: typeof selectMarker) => {
      selectMarker = listener;
      return { remove: vi.fn() };
    }),
    setStyle: vi.fn(), remove: vi.fn(), setMap: vi.fn(),
  };
  vi.stubGlobal("google", { maps: {
    Map: constructMap,
    Data: function () { return layer; },
    LatLngBounds: function () { return { extend: vi.fn() }; },
  } });
  const append = vi.spyOn(document.head, "append");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => (
    <StrictMode>
      <QueryClientProvider client={client}><TransitExplorer apiKey="test-only-key" /></QueryClientProvider>
    </StrictMode>
  );
  const { rerender, unmount } = render(view());
  const user = userEvent.setup();

  try {
    const bootstrap = loadGoogleMaps("test-only-key");
    expect(loadGoogleMaps("test-only-key")).toBe(bootstrap);
    await act(async () => {
      window.geospatialFunMapsReady?.();
      await bootstrap;
    });
    await screen.findByRole("alert");
    const requestsBeforeRetry = fetch.mock.calls.length;
    dataAvailable = true;
    await user.click(screen.getByRole("button", { name: "Retry data load" }));
    await screen.findByRole("button", { name: /Ware Station/ });

    for (let index = 0; index < 2; index++) {
      rerender(view());
      await user.click(screen.getByRole("button", { name: "Hide results" }));
      await user.click(screen.getByRole("button", { name: "Show results" }));
      await user.type(screen.getByRole("searchbox"), "Ware");
      await user.selectOptions(screen.getByLabelText("Category"), "train_station");
      await user.click(screen.getByRole("button", { name: /Ware Station/ }));
      await user.click(screen.getByRole("button", { name: "Map overview" }));
      await user.click(screen.getByRole("button", { name: "Clear filters" }));
    }
    expect(selectMarker).toBeTypeOf("function");
    act(() => selectMarker?.({ feature: { getId: () => "osm-node-2" } }));
    expect(screen.getByRole("region", { name: "Selected place" }).textContent).toContain("Ware Road");
    expect(append.mock.calls.flat().filter((node) =>
      node instanceof HTMLScriptElement && node.src.startsWith("https://maps.googleapis.com/"),
    )).toHaveLength(1);
    expect(constructMap).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),
      expect.objectContaining({ streetViewControl: false }));
    expect(fetch).toHaveBeenCalledTimes(requestsBeforeRetry + 1);
    expect(fetch.mock.calls.every(([url]) => url === "/data/herts-transit.geojson")).toBe(true);
  } finally {
    unmount();
    client.clear();
    document.head.querySelector('script[src^="https://maps.googleapis.com/"]')?.remove();
    delete window.gm_authFailure;
  }
});
