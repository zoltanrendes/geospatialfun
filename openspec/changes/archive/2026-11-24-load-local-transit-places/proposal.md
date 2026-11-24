# Proposal

## Why

Transit UI components need a shared way to load the bundled Hertfordshire dataset and tell when it is ready, empty or unavailable.

## What Changes

- Add a TanStack Query hook for fetching the bundled GeoJSON with cancellation and HTTP error handling.
- Reuse the existing GeoJSON mapper and transit types to expose validated transit places.
- Cache the static dataset under a stable key and expose query states to future UI consumers.

## Capabilities

### New Capabilities

- `local-transit-places` provides cached access to validated transit places from the bundled dataset.

### Modified Capabilities

## Impact

The change adds `src/hooks/useTransitPlaces.ts`, a dedicated local data loader and Vitest coverage. It uses the existing query provider, mapper and domain types. All data requests stay on the application's origin.
