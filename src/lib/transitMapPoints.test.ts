import { expect, it } from "vitest";
import type { TransitPlace } from "../types/transit";
import { buildTransitMapPoints } from "./transitMapPoints";

const places: TransitPlace[] = Array.from({ length: 300 }, (_, index) => ({
  id: String(index), osmId: index + 1, name: String(index), category: "bus_stop",
  position: { lat: 51.8 + index / 100_000, lng: -0.2 }, ref: null, operator: null,
}));

it("groups dense points at overview zoom and preserves the selected point", () => {
  const points = buildTransitMapPoints(places, 10, "0");
  expect(points.size).toBeLessThan(10);
  expect(points.get("0")?.kind).toBe("selected_bus_stop");
  expect([...points.values()].reduce((total, point) => total + (point.members?.length ?? 1), 0)).toBe(300);
});

it("renders individual nearby points at detail zoom", () => {
  const points = buildTransitMapPoints(places, 16, "0", ({ lat }) => lat > 51.8029);
  expect(points.has("0")).toBe(true);
  expect(points.has("1")).toBe(false);
  expect(points.has("299")).toBe(true);
  expect([...points.values()].every((point) => !point.members)).toBe(true);
});
