# Tasks

## 1. Local transit data loader

- [x] 1.1 Add Vitest tests for `loadTransitPlaces` covering the request URL and signal, cancellation, non-success HTTP status before body parsing, network failure, invalid JSON, an invalid collection envelope, mixed features and a successful empty collection. Confirm the new tests fail before implementing the loader.
- [x] 1.2 Implement `src/lib/transitData.ts` using `fetch`, the existing `TransitPlace` type and `mapGeoJsonToTransitPlaces`. Run the loader tests with `yarn test src/lib/transitData.test.ts`.

## 2. TanStack Query hook

- [x] 2.1 Add Vitest checks for pending, error and successful empty results, signal forwarding and fresh cache reuse across query observers. Use an isolated query client with retries disabled for deterministic failure assertions. Confirm the new checks fail before adding the hook.
- [x] 2.2 Implement `src/hooks/useTransitPlaces.ts` with the stable key, `staleTime: Infinity` and the existing provider. Use the same query options for the hook and any observer-based tests. Run the hook checks with `yarn test src/hooks/useTransitPlaces.test.ts`.

## 3. Integration verification

- [x] 3.1 Run `yarn test` and `yarn build`. Confirm the build includes `dist/data/herts-transit.geojson` and the fetch path matches the bundled asset.
