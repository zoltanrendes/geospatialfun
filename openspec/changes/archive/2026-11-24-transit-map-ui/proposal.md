# Proposal

## Why

The bundled Hertfordshire transit dataset is available through `useTransitPlaces`. A map and searchable list will let people find stops and stations and inspect their details on desktop and mobile.

## What Changes

- Add a responsive transit map with a results panel, local search and filters, and selected-place details.
- Render the bundled places as selectable markers and provide an overview control.
- Use Maps JavaScript API for the map and keep transit interactions entirely local.
- Keep local results and details usable when the map is unavailable.
- Add component and integration tests using Vitest and React Testing Library with a mocked Maps API.

## Capabilities

### New Capabilities

- `transit-map-ui` provides map and list browsing, local filters, place details and graceful degradation.

### Modified Capabilities

## Impact

The application entry point will mount the new UI under the existing query provider. The UI will consume the existing `local-transit-places` capability and use `VITE_GOOGLE_MAPS_API_KEY` for the browser map. React Testing Library and a DOM test environment will be added as development dependencies.
