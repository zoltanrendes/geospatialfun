# Design

## Context

Vite serves `public/data/herts-transit.geojson` at `/data/herts-transit.geojson`. The application already uses a `QueryClientProvider`. The existing `src/lib/transitMapper.ts` validates the collection, filters invalid features and converts coordinates into the `TransitPlace` model from `src/types/transit.ts`.

## Goals / Non-Goals

**Goals**

- Make request, parsing and mapping behaviour testable through a dedicated loader.
- Give React consumers a shared query result for the local dataset.

**Non-Goals**

- Map rendering, search controls and other UI changes.
- External services and persistent caching.

## Decisions

- Put `loadTransitPlaces(signal: AbortSignal): Promise<TransitPlace[]>` in `src/lib/transitData.ts`. Use `fetch` with the supplied signal, check `response.ok` before reading the body and include the HTTP status code in failures. Read the decoded body as `unknown` and pass it to `mapGeoJsonToTransitPlaces`. Let network, cancellation, parsing and validation errors propagate. A dedicated loader makes these behaviours directly testable without rendering React.
- In `src/hooks/useTransitPlaces.ts`, call `useQuery` with a module-level `['transit-places'] as const` key and a query function that forwards TanStack Query's signal to the loader. Use `staleTime: Infinity` because the data changes with deployments. Use the existing query client and its normal cache retention.
- Return the query result directly. Consumers can use `isPending`, `isError`, `error` and `isSuccess`. Empty data is represented by an empty array on success.

## Risks / Trade-offs

- An already open session can retain data from the previous deployment. A fresh application load or explicit query invalidation can fetch the current asset.
- Serving a fallback HTML page with a successful status will produce a JSON parsing error and surface through the query error state.
