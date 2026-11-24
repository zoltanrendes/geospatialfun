import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { transitPlacesQueryOptions } from "./useTransitPlaces";

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

it("exposes pending and successful empty results and shares fresh data", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({
    type: "FeatureCollection",
    features: [],
  }));
  vi.stubGlobal("fetch", fetch);
  const first = new QueryObserver(client, transitPlacesQueryOptions);
  const unsubscribeFirst = first.subscribe(() => {});
  const second = new QueryObserver(client, transitPlacesQueryOptions);
  let unsubscribeSecond: (() => void) | undefined;

  try {
    expect(first.getCurrentResult()).toMatchObject({ isPending: true, data: undefined });
    expect(await first.refetch()).toMatchObject({ isSuccess: true, data: [] });

    unsubscribeSecond = second.subscribe(() => {});
    expect(second.getCurrentResult()).toMatchObject({ isSuccess: true, isStale: false, data: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    unsubscribeSecond?.();
    unsubscribeFirst();
  }
});

it("exposes HTTP failures in the query result", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  const observer = new QueryObserver(client, transitPlacesQueryOptions);
  const result = await observer.refetch();

  expect(result.isError).toBe(true);
  expect(result.error?.message).toContain("503");
});

it("forwards TanStack Query cancellation to fetch", async () => {
  const fetch = vi.fn((_url: string, { signal }: { signal: AbortSignal }) =>
    new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  );
  vi.stubGlobal("fetch", fetch);
  const observer = new QueryObserver(client, transitPlacesQueryOptions);
  const unsubscribe = observer.subscribe(() => {});

  try {
    const signal = fetch.mock.calls[0]?.[1].signal;
    expect(signal?.aborted).toBe(false);
    await client.cancelQueries({ queryKey: transitPlacesQueryOptions.queryKey });
    expect(signal?.aborted).toBe(true);
    expect(observer.getCurrentResult()).toMatchObject({ isPending: true, fetchStatus: "idle" });
    expect(client.getQueryData(transitPlacesQueryOptions.queryKey)).toBeUndefined();
  } finally {
    unsubscribe();
  }
});
