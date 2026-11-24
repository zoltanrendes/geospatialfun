// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { TransitExplorer } from "./TransitExplorer";

/**
 * Supply raw records so UI tests also exercise the real transit mapper.
 *
 * @param osmId - The fixture's OSM identifier.
 * @param name - The label displayed in results.
 * @param category - The raw category to map.
 * @param ref - An optional filterable reference.
 * @returns A raw feature for the UI fixture.
 */
const feature = (osmId: number, name: string, category: string, ref?: string) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [-0.2, 51.8] },
  properties: { osmId, name, category, ref },
});
/**
 * Preserve the response envelope expected by the real loader.
 *
 * @param features - The fixture entries for the response.
 * @returns A successful JSON response for the mocked fetch.
 */
const response = (features: unknown[]) => Response.json({ type: "FeatureCollection", features });

/**
 * Isolate the query cache and surface load failures without retry delays.
 *
 * @param apiKey - A test key for Maps bootstrap, or blank for fallback.
 * @returns A user-event session for the mounted explorer.
 */
function openExplorer(apiKey = "") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TransitExplorer apiKey={apiKey} /></QueryClientProvider>);
  return userEvent.setup();
}

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('script[src^="https://maps.googleapis.com/"]').forEach((script) => script.remove());
  vi.unstubAllGlobals();
});

it("filters locally, lets keyboard users select a result, and clears zero matches", async () => {
  const fetch = vi.fn().mockResolvedValue(response([
    feature(1, "Ware Station", "train_station", "WAE"),
    feature(2, "Ware Road", "bus_stop"),
  ]));
  vi.stubGlobal("fetch", fetch);
  const user = openExplorer();
  const list = await screen.findByRole("list", { name: "Transit results" });
  expect(screen.getByText("Map unavailable")).toBeTruthy();
  expect(document.head.querySelector("script")).toBeNull();

  await user.selectOptions(screen.getByLabelText("Category"), "train_station");
  await user.selectOptions(screen.getByLabelText("Reference"), "WAE");
  expect(within(list).queryByRole("button", { name: /Ware Road/ })).toBeNull();
  within(list).getByRole("button", { name: /Ware Station/ }).focus();
  await user.keyboard("{Enter}");
  expect(within(screen.getByRole("region", { name: "Selected place" })).getByText("Ware Station")).toBeTruthy();

  await user.type(screen.getByRole("searchbox"), "no such place");
  expect(screen.getByText("No places match your filters.")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Selected place" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByRole("button", { name: /Ware Road/ })).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("toggles the mobile results panel with an accessible control", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
  const user = openExplorer();
  const toggle = screen.getByRole("button", { name: "Hide results" });
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  await user.click(toggle);
  expect(screen.getByRole("button", { name: "Show results" }).getAttribute("aria-expanded")).toBe("false");
});

it("shows loading, a retryable failure, and an empty dataset", async () => {
  const fetch = vi.fn()
    .mockRejectedValueOnce(new TypeError("Network unavailable"))
    .mockResolvedValueOnce(response([]));
  vi.stubGlobal("fetch", fetch);
  const user = openExplorer();
  expect(screen.getByText("Loading transit places…")).toBeTruthy();
  expect((await screen.findByRole("alert")).textContent).toContain("Transit data could not be loaded.");
  await user.click(screen.getByRole("button", { name: "Retry data load" }));
  expect(await screen.findByText("No transit places are available.")).toBeTruthy();
});

it("keeps browsing and details available after a Maps script failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([feature(1, "Ware Station", "train_station")])));
  const user = openExplorer("test-only-key");
  const script = document.head.querySelector('script[src^="https://maps.googleapis.com/"]');
  expect(script).not.toBeNull();
  await act(async () => { script?.dispatchEvent(new Event("error")); });
  expect(screen.getByText("Map unavailable")).toBeTruthy();
  await user.click(await screen.findByRole("button", { name: /Ware Station/ }));
  expect(screen.getByRole("region", { name: "Selected place" })).toBeTruthy();
});
