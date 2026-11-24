# Transit map UI

## Purpose

Let people browse the bundled Hertfordshire stops and stations on a map or in a searchable list on desktop and mobile.

## ADDED Requirements

### Requirement: Local transit interactions

The UI SHALL consume `useTransitPlaces` and compute search, filters, results and selection from its local data. Google usage SHALL be limited to Maps JavaScript API for basemap rendering and local point overlays.

#### Scenario: Search and filter without external lookups

- **WHEN** a user types a name or identifier, filters by category or available reference, or selects a result
- **THEN** the UI uses only loaded transit data for the interaction
- **AND** it performs no remote lookup for input, suggestions, place details, geocoding or directions

#### Scenario: Clear active filters

- **WHEN** a user clears the filters
- **THEN** the results list and map points reflect all loaded places

### Requirement: Stable map lifecycle

With a configured `VITE_GOOGLE_MAPS_API_KEY`, the UI SHALL maintain one live Google map for its mounted view and update the point layer in place. It SHALL release its listeners and point overlays on teardown.

#### Scenario: Update the mounted map

- **WHEN** filters, selection or unrelated React state change
- **THEN** the same map instance remains in use and camera operations do not feed back into state updates

#### Scenario: Leave the map before loading finishes

- **WHEN** the view unmounts during Maps API loading
- **THEN** the obsolete load cannot create a map or update the unmounted view

### Requirement: Bounded Google Maps usage

The UI SHALL start at most one Maps JavaScript bootstrap attempt per page lifetime and construct at most one map per mounted view, including React Strict Mode effect replay. It SHALL reuse pending and successful bootstrap work, retain a terminal failure for the page lifetime, and disable Street View.

#### Scenario: Concurrent bootstrap and repeated UI updates

- **WHEN** multiple callers overlap or the view rerenders during or after bootstrap, including Strict Mode replay, mobile panel toggles and data retries
- **THEN** the page inserts at most one Maps bootstrap script and constructs at most one map for that mounted view
- **AND** search, filter, selection and overview actions start no additional bootstrap attempts, map loads or service lookups

#### Scenario: Preserve fallback after a terminal Maps failure

- **WHEN** bootstrap times out, the script fails or Google rejects authentication
- **THEN** the UI keeps the fallback for that page lifetime and starts no automatic Maps retry
- **AND** a late callback cannot create a map or clear the failure

### Requirement: Selection and map overview

The map SHALL render locally filtered places as markers. Selecting a marker or result SHALL open the same place details, highlight that place and focus the map when available. The overview control SHALL frame the current filtered points, or all points when filters are clear.

#### Scenario: Select a stop or station

- **WHEN** a user selects a result or marker
- **THEN** the UI shows its name, category, and available reference and operator
- **AND** the map highlights and focuses that place if it is available

#### Scenario: Select the same place again after restoring the overview

- **WHEN** a user restores the overview and selects the already selected place through its result or marker
- **THEN** the map focuses that place again and its details remain open

#### Scenario: Restore the overview

- **WHEN** a user invokes the overview with multiple matching places
- **THEN** the map fits the matching points once

#### Scenario: Restore the overview with one or zero matches

- **WHEN** the overview has a single match or no matches
- **THEN** it focuses the single point with bounded zoom or leaves the camera in place respectively

#### Scenario: Browse a dense set of results

- **WHEN** many places match at overview zoom
- **THEN** nearby points may be shown as a selectable group that frames its members
- **AND** the selected place remains individually identifiable and the results list retains all matches

### Requirement: Responsive browsing

The UI SHALL present a map, filter and results controls, and selected-place details across desktop and mobile layouts. Filters and results SHALL remain accessible by keyboard, and the mobile panel SHALL be collapsible with an accessible control.

#### Scenario: Browse on a narrow viewport

- **WHEN** a user opens the results panel on mobile and selects a place
- **THEN** the controls and details remain usable without horizontal scrolling
- **AND** the map remains available when the panel is collapsed

#### Scenario: Browse a long results list within the viewport

- **WHEN** the default desktop or mobile view displays more results than fit in the panel
- **THEN** the header, map and panel fit within the browser viewport without vertical page scrolling
- **AND** the user can scroll the results within the panel

### Requirement: Data and map fallback states

The UI SHALL distinguish loading, failed loads, a dataset without usable places and zero filter matches. If Maps configuration or loading fails, the UI SHALL explain that the map is unavailable and keep local browsing operational whenever data is available.

#### Scenario: Missing Maps key

- **WHEN** the Maps key is absent or blank
- **THEN** no Maps script is requested and local results and details remain usable

#### Scenario: Script or authentication failure

- **WHEN** the Maps script fails to load or Google rejects the key or referrer
- **THEN** the UI shows the map fallback and keeps available local results and details usable

#### Scenario: Filter yields zero matches

- **WHEN** the loaded dataset is non-empty and active filters exclude every place
- **THEN** the UI shows a no-results message, offers filter reset and displays no transit markers

#### Scenario: Transit data unavailable

- **WHEN** the transit request is pending, fails or succeeds with no usable places
- **THEN** the UI shows the corresponding loading, error with retry, or empty dataset state
