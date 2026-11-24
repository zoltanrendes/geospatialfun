import { useMemo, useState } from "react";
import { useTransitPlaces } from "../hooks/useTransitPlaces";
import { filterTransitPlaces, initialTransitFilters } from "../lib/transitFilters";
import type { TransitFilters } from "../lib/transitFilters";
import type { TransitPlace } from "../types/transit";
import { TransitMap } from "./TransitMap";
import "./transitExplorer.css";

const noPlaces: readonly TransitPlace[] = [];
const pageSize = 30;
const categoryLabels = { train_station: "Train station", bus_stop: "Bus stop" } as const;

export function TransitExplorer({ apiKey }: { apiKey: string }) {
  const query = useTransitPlaces();
  const places = query.data ?? noPlaces;
  const [filters, setFilters] = useState(initialTransitFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [page, setPage] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [overview, setOverview] = useState(0);
  const visiblePlaces = useMemo(() => filterTransitPlaces(places, filters), [places, filters]);
  const references = useMemo(() => {
    const values = new Set<string>();
    places.forEach(({ ref }) => { if (ref?.trim()) values.add(ref); });
    return [...values].sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }));
  }, [places]);
  const selected = visiblePlaces.find(({ id }) => id === selectedId);
  const filtersActive = Boolean(filters.search || filters.category || filters.reference);
  const pageCount = Math.max(1, Math.ceil(visiblePlaces.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const offset = currentPage * pageSize;

  // Repeated selection must refocus the camera even when the active ID stays the same.
  function selectPlace(id: string) {
    setSelectedId(id);
    setFocusRequest((request) => request + 1);
  }

  // Reset pagination and clear details that no longer belong to the visible results.
  function updateFilters(next: TransitFilters) {
    setFilters(next);
    setPage(0);
    if (selected && filterTransitPlaces([selected], next).length === 0) setSelectedId(null);
  }

  return (
    <main className="transit-explorer">
      <header className="transit-header">
        <div className="transit-header__mark" aria-hidden="true">↗</div>
        <div>
          <h1>Hertfordshire transit</h1>
          <p>Bus stops and train stations</p>
        </div>
      </header>

      <div className="transit-layout">
        <TransitMap apiKey={apiKey} visiblePlaces={visiblePlaces}
          selectedId={selected?.id ?? null} focusRequest={focusRequest} overview={overview} onSelect={selectPlace}
          onOverview={() => setOverview((value) => value + 1)} />

        <aside className="transit-panel" aria-labelledby="results-heading">
          <div className="transit-panel__heading">
            <h2 id="results-heading">Explore places</h2>
            <button className="transit-panel__toggle" type="button" aria-expanded={panelOpen}
              aria-controls="transit-results-panel" onClick={() => setPanelOpen(!panelOpen)}>
              {panelOpen ? "Hide results" : "Show results"}
            </button>
          </div>

          <div id="transit-results-panel" className="transit-panel__body" data-expanded={panelOpen}>
            <fieldset className="transit-filters" disabled={places.length === 0}>
              <legend className="transit-sr-only">Filter transit places</legend>
              <label className="transit-search">Search
                <input type="search" value={filters.search} placeholder="Name or stop ID"
                  onChange={(event) => updateFilters({ ...filters, search: event.target.value })} />
              </label>
              <label>Category
                <select value={filters.category} onChange={(event) => {
                  const value = event.target.value;
                  updateFilters({ ...filters, category: value === "bus_stop" || value === "train_station" ? value : "" });
                }}>
                  <option value="">All categories</option>
                  <option value="train_station">Train stations</option>
                  <option value="bus_stop">Bus stops</option>
                </select>
              </label>
              <label>Reference
                <select value={filters.reference} disabled={references.length === 0}
                  onChange={(event) => updateFilters({ ...filters, reference: event.target.value })}>
                  <option value="">All references</option>
                  {references.map((reference) => <option key={reference}>{reference}</option>)}
                </select>
              </label>
              {filtersActive && (
                <button className="transit-filters__clear" type="button"
                  onClick={() => updateFilters(initialTransitFilters)}>Clear filters</button>
              )}
            </fieldset>

            {selected && (
              <section className="transit-detail" aria-label="Selected place">
                <div>
                  <p>{categoryLabels[selected.category]}</p>
                  <h3>{selected.name}</h3>
                </div>
                <button type="button" onClick={() => setSelectedId(null)}>Close details</button>
                {(selected.ref || selected.operator) && (
                  <dl>
                    {selected.ref && <div><dt>Reference</dt><dd>{selected.ref}</dd></div>}
                    {selected.operator && <div><dt>Operator</dt><dd>{selected.operator}</dd></div>}
                  </dl>
                )}
              </section>
            )}

            {query.isPending && <p className="transit-message" role="status">Loading transit places…</p>}
            {query.isError && (
              <div className="transit-message">
                <p role="alert">Transit data could not be loaded.</p>
                <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>
                  Retry data load
                </button>
              </div>
            )}
            {query.isSuccess && places.length === 0 && (
              <p className="transit-message" role="status">No transit places are available.</p>
            )}
            {places.length > 0 && visiblePlaces.length === 0 && (
              <p className="transit-message" role="status">No places match your filters.</p>
            )}
            {visiblePlaces.length > 0 && (
              <>
                <p className="transit-count" role="status">
                  {visiblePlaces.length.toLocaleString("en-GB")} {visiblePlaces.length === 1 ? "place" : "places"}
                </p>
                <ul className="transit-results" aria-label="Transit results">
                  {visiblePlaces.slice(offset, offset + pageSize).map((place) => (
                    <li key={place.id}>
                      <button type="button" aria-pressed={place.id === selected?.id} onClick={() => selectPlace(place.id)}>
                        <span className="transit-results__symbol" data-category={place.category} aria-hidden="true" />
                        <span><strong>{place.name}</strong><small>{categoryLabels[place.category]}</small></span>
                        {place.ref && <span className="transit-results__ref">{place.ref}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {pageCount > 1 && (
                  <nav className="transit-pagination" aria-label="Result pages">
                    <button type="button" disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}>Previous</button>
                    <span>Page {currentPage + 1} of {pageCount}</span>
                    <button type="button" disabled={currentPage + 1 === pageCount}
                      onClick={() => setPage(currentPage + 1)}>Next</button>
                  </nav>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
