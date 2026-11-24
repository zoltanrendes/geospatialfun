// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => {
  document.head.querySelectorAll("script").forEach((script) => script.remove());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("skips the script for a missing key", async () => {
  const { loadGoogleMaps } = await import("./googleMaps");
  await expect(loadGoogleMaps(" ")).rejects.toThrow("key");
  expect(document.head.querySelector("script")).toBeNull();
});

it("shares concurrent and completed loads and reports late authentication failure", async () => {
  const { loadGoogleMaps, subscribeToMapsFailure } = await import("./googleMaps");
  const maps = { Map: vi.fn(), Data: vi.fn(), LatLngBounds: vi.fn() };
  vi.stubGlobal("google", { maps });
  const failure = vi.fn();
  const unsubscribe = subscribeToMapsFailure(failure);

  const first = loadGoogleMaps("test-key");
  expect(loadGoogleMaps("test-key")).toBe(first);
  expect(document.head.querySelectorAll("script")).toHaveLength(1);
  window.geospatialFunMapsReady?.();
  await expect(first).resolves.toBe(maps);
  expect(loadGoogleMaps("test-key")).toBe(first);
  window.gm_authFailure?.();
  expect(failure).toHaveBeenCalledTimes(1);
  await expect(loadGoogleMaps("test-key")).rejects.toThrow("authentication");
  expect(document.head.querySelectorAll("script")).toHaveLength(1);
  unsubscribe();
});

it.each(["error", "timeout", "authentication"])("retains a terminal %s failure", async (mode) => {
  vi.useFakeTimers();
  const { loadGoogleMaps } = await import("./googleMaps");
  const first = loadGoogleMaps("test-key");
  const lateCallback = window.geospatialFunMapsReady;
  const failure = expect(first).rejects.toThrow();
  const script = document.head.querySelector("script");
  expect(script).not.toBeNull();
  if (mode === "error") script?.dispatchEvent(new Event("error"));
  if (mode === "authentication") window.gm_authFailure?.();
  if (mode === "timeout") await vi.runAllTimersAsync();
  await failure;
  lateCallback?.();
  expect(loadGoogleMaps("test-key")).toBe(first);
});
