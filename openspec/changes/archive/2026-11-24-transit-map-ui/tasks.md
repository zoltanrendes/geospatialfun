# Tasks

## 1. Test setup and local behaviour

- [x] 1.1 Add React Testing Library, user-event and a Vitest DOM environment via Yarn. Keep existing Node tests runnable and verify with `yarn test`.
- [x] 1.2 Write failing Vitest cases for name and ID search, category and reference filters, combined filters and reset. Implement local filtering and verify the focused tests pass.

## 2. Maps integration


- [x] 2.1 Test bootstrap with a fake Google API, covering missing key, shared loading, script error, timeout and authentication failure before and after readiness. Implement the typed loader and verify the bootstrap tests pass.
- [x] 2.2 Test map construction and cleanup under React Strict Mode, including rerenders, filter changes and unmount during script loading. Implement stable map ownership and verify the lifecycle tests pass.
- [x] 2.3 Test marker visibility and highlighting, marker selection, initial framing, selection focus and overview with zero, one and multiple points. Implement keyed point updates and camera actions, then verify the mocked Maps tests pass.

## 3. Responsive transit experience

- [x] 3.1 Write React Testing Library tests for local search and filters, selection from list and map, keyboard controls and mobile panel state. Mount the responsive map, results and details under the existing QueryClientProvider and verify the interaction tests pass.
- [x] 3.2 Write component tests for data loading, retryable data error, empty dataset, zero results, missing key and Maps failures. Implement each state and verify local browsing remains available when Maps fails.

## 4. Integration verification

- [x] 4.1 Run `yarn test` and `yarn build`. Verify search, filtering and selection initiate no application lookup requests beyond the bundled dataset, using an instrumented mocked integration test.
- [x] 4.2 Check desktop and mobile layouts with the full dataset, including keyboard navigation and usable map fallback. Record whether live Maps rendering was verified with an available authorised key.
- [x] 4.3 Add mocked cost regression checks that count script insertions and map constructor calls. Assert one of each for a successful visible view across concurrent bootstrap calls, Strict Mode replay, rerenders, mobile panel toggles, data retry and repeated search, filter, selection and overview actions. Verify failed bootstrap is attempted once, late success is ignored and Street View is disabled.

## Verification notes

- Vitest passed all 49 tests, including clustering, selected-point visibility, settled zoom updates, viewport filtering and the mocked request and map construction counts. The production build passed.
- At zoom 10 the point layer represents all 4,726 places with 61 rendered points and groups.
- The mocked Maps integration test verifies that selecting the same result or marker after restoring the overview focuses it again without creating another map.
- Headless Chromium verified the production build at 1,366 × 900, 1,024 × 600, 360 × 800 and 375 × 500. The page fitted within the viewport, the panel scrolled internally, and the mobile panel could collapse and reopen. The check also covered keyboard selection, map fallback and one local data request.
- Live Google Maps rendering was not verified. Browser checks intercepted all external requests.
