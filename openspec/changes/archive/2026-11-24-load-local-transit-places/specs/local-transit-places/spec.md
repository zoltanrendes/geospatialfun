# Local transit places

## Purpose

Provide application consumers with validated Hertfordshire transit places from the dataset shipped with the application.

## ADDED Requirements

### Requirement: Local transit data loading

The loader SHALL use `fetch` to request `/data/herts-transit.geojson` from the application's origin and SHALL pass the TanStack Query `AbortSignal` to the request. Transit loading SHALL use only the bundled data source.

#### Scenario: Start a transit query

- **WHEN** the transit query runs
- **THEN** the loader requests the bundled GeoJSON with the supplied signal

#### Scenario: Cancel a pending request

- **WHEN** the query's signal is aborted during the fetch
- **THEN** the request is cancelled and its result is never cached as a successful load

### Requirement: Loading failures

The loader SHALL reject non-success HTTP responses with an error containing the status code. Network, JSON parsing and invalid collection errors SHALL propagate to the query.

#### Scenario: Local asset returns an HTTP error

- **WHEN** the server responds with HTTP 404
- **THEN** the loader rejects with an error identifying the 404 status and skips parsing the response body

#### Scenario: Invalid payload

- **WHEN** a successful response contains invalid JSON or its decoded value lacks a valid `FeatureCollection` envelope with a `features` array
- **THEN** the query reports an error

### Requirement: Validated transit places

The loader SHALL return `TransitPlace[]` by mapping valid `Point` features with category `train_station` or `bus_stop`. The mapper SHALL skip invalid features and convert GeoJSON `[lng, lat]` coordinates into `{ lat, lng }`.

#### Scenario: Mixed collection

- **WHEN** a collection contains valid train stations and bus stops alongside invalid features, unsupported categories, non-point geometries or invalid coordinates
- **THEN** only the valid transit points are returned with the correct latitude and longitude

#### Scenario: Empty result

- **WHEN** a valid feature collection contains no usable transit features
- **THEN** the query succeeds with an empty array

### Requirement: Cached query state

`useTransitPlaces` SHALL use TanStack Query's `useQuery` with a stable key and a long or infinite `staleTime`. It SHALL expose pending, error and successful result states through the query result.

#### Scenario: Observe loading and result states

- **WHEN** the first request is pending
- **THEN** consumers can distinguish pending from a successful empty result and from a failed request

#### Scenario: Reuse fresh data

- **WHEN** another consumer requests transit places while the cached data is still present and fresh
- **THEN** the consumer receives the cached places without an additional fetch
