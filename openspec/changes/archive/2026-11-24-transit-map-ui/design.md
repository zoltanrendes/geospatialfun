# Design

## Context

The React entry point already provides TanStack Query. `useTransitPlaces` returns validated records with an ID, name, category, position, optional reference and optional operator. The model contains no route or line relationships. Vitest is installed. React Testing Library and a DOM test environment are needed for component tests.

## Goals / Non-Goals

**Goals**

- Provide a map-first layout with a clear hierarchy for search, results and place details on desktop and mobile.
- Keep local filtering and selection responsive independently of Google Maps availability.
- Bound map creation, listener ownership and camera updates to explicit lifecycle transitions and user actions.

**Non-Goals**

- Route lookup, journey planning, geocoding, autocomplete services and external enrichment.
- Importing or constructing a route network from stop references.

## Decisions

- **Maps bootstrap.** Wrap a shared, lazy Maps JavaScript bootstrap in a typed adapter. Read the key via Vite, skip bootstrap for a blank value and keep a single in-flight script load. Register Google's `gm_authFailure` callback before loading and propagate authentication failures even after initialisation. Handle script errors and a bounded loading timeout. Clean up owned callbacks, timers and listeners, and guard pending continuations after unmount. Use a placeholder in `.env.example` if configuration documentation is needed. Configure browser referrer and Maps JavaScript API restrictions on the deployment key.
- **Point rendering.** Use the Maps JavaScript Data layer with shared point styles and update features by ID. For dense results, group points into local screen-scale grid cells below detail zoom and limit close-up rendering to the viewport. Reconcile after the map settles, skipping unchanged views. Keep the selected place separate, frame a group's members on click and release owned features and listeners on cleanup. This uses the key-only map configuration. [Google Maps Data layer](https://developers.google.com/maps/documentation/javascript/datalayer).
- **Map ownership and camera.** Store the instance in a ref and initialise it independently of filters, selection and data. Keep the map host mounted across layout changes. Ignore obsolete loads and check the existing instance before creation, including during React Strict Mode effect replay. After map and data readiness, frame the initial visible set once unless a selected place takes priority. Run focus on a selection action and overview on explicit request. Use bounded zoom for a single point and treat an empty set as a camera no-op. Filtering updates the layer without driving the camera. Camera events do not dispatch React selection or filter updates.
- **Local state.** Match names, application IDs and OSM IDs case-insensitively. Derive category and reference filters from the local records, using present `ref` values as references. Combine active filters and share the resulting set between the list and map. Keep a single selected ID, clear it when filters exclude it and render details from the matched record.
- **Layout and states.** Use a persistent map with a desktop side panel and a collapsible mobile results sheet. Present clear typography, distinct category symbols and visible keyboard focus. Keep the results region scrollable and bound the rendered list with pagination or windowing. Keep data loading, retryable data failure, empty data, zero matches and map errors distinct. Map failures leave the local panel and detail card interactive.
- **Viewport sizing.** Size the explorer to the dynamic viewport height and give the map and results layout the remaining space beneath the header. Allow the panel body to scroll internally. On mobile, collapsing the panel returns its space to the map.
- **Repeated selection.** Each activation of a result or marker issues a new camera focus request, including when the selected ID remains the same. Keep focus requests independent of marker style updates.
- **Test boundary.** Add React Testing Library, user-event and a DOM environment as development dependencies while keeping existing Node tests. Mock the Maps adapter for component behaviour and use a fake Maps surface for lifecycle, bootstrap and camera assertions. Automated tests require neither a real key nor Google requests.

## Risks / Trade-offs

- **Cost controls.** Keep a page-scoped bootstrap result with pending, ready and terminal failure states. Share the pending promise and retain failure through rerenders and remounts. A page reload starts a new attempt. Late success cannot override timeout or authentication failure. Disable Street View and keep the map host stable across breakpoints, panel toggles and transit query retries. Assert exact script insertion and map constructor counts with fakes. Measure application-triggered initialisation and service calls independently of internal Maps tile traffic.

- The dataset contains thousands of points. Reusing features by ID and bounding the results DOM reduce work during filtering. Check the desktop and mobile views with the full dataset.
- A map load can incur Google Maps Platform usage. Use one live map per mounted view and limit external integration to Maps JavaScript API. [Maps JavaScript API usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing).
- A real key and authorised referrer are needed to check live Google rendering. Use mocked tests for repeatable verification and record whether live verification was performed.
