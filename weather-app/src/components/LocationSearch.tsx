import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useBackButtonClose } from "../hooks/useBackButtonClose";
import { searchPlaces } from "../locationService/locationService";
import {
  loadPlaceIndex,
  searchIndex,
  type IndexedPlace,
} from "../locationService/placeIndex";
import type { Location, PlaceSuggestion } from "../locationService/locationTypes";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  type RecentSearch,
} from "../utils/recentSearches";

interface LocationSearchProps {
  onSelect: (location: Location) => void;
  placeholder?: string;
  label?: string;
}

// Open-Meteo only matches from 3 characters (fallback search only).
const FALLBACK_MIN_LENGTH = 3;

const KIND_TAGS = { state: "State", country: "Country" } as const;

function LocationSearch({
  onSelect,
  placeholder = "Search for a city",
  label = "Search for a city",
}: LocationSearchProps) {
  const [query, setQuery] = useState("");
  // Clicking the blur (or Back) hides the suggestions until the text changes
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  // Recent searches: shown when the box is focused and empty
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<RecentSearch[]>(getRecentSearches);

  // Built-in list: loads in the background as soon as the screen opens.
  const [index, setIndex] = useState<IndexedPlace[] | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);

  // Fallback (Open-Meteo) results, only used if the built-in list can't load.
  const [fallback, setFallback] = useState<{ query: string; results: PlaceSuggestion[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    loadPlaceIndex()
      .then((places) => {
        if (active) setIndex(places);
      })
      .catch((err) => {
        console.error("Built-in place list failed to load, using online search:", err);
        if (active) setIndexFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const trimmed = query.trim();

  const localResults = useMemo(
    () => (index && trimmed ? searchIndex(index, trimmed) : []),
    [index, trimmed]
  );

  useEffect(() => {
    if (!indexFailed || trimmed.length < FALLBACK_MIN_LENGTH) return;

    let cancelled = false;

    // Debounce: wait 300ms after the last keystroke before searching
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(trimmed);
        if (!cancelled) {
          setFallback({ query: trimmed, results });
          setError("");
        }
      } catch (err) {
        console.error("Location search failed:", err);
        if (!cancelled) setError("Could not search locations.");
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [indexFailed, trimmed]);

  // What to show for the current text. "No matches" only once a search for
  // exactly this text has finished and found nothing, never while loading.
  let suggestions: PlaceSuggestion[] = [];
  let searched = false;

  if (index) {
    suggestions = localResults;
    searched = trimmed.length > 0;
  } else if (indexFailed && trimmed.length >= FALLBACK_MIN_LENGTH && fallback?.query === trimmed) {
    suggestions = fallback.results;
    searched = true;
  }

  const showNoMatches = searched && !error && suggestions.length === 0;
  const showRecent = focused && !trimmed && recent.length > 0;
  const hasPanel =
    showRecent || (Boolean(trimmed) && (suggestions.length > 0 || showNoMatches || Boolean(error)));
  const open = hasPanel && dismissedFor !== query;

  useBackButtonClose(open, () => setDismissedFor(query));

  function handleSelect(suggestion: PlaceSuggestion) {
    onSelect(suggestion.location); // coordinates are already included
    setRecent(addRecentSearch(suggestion));
    setQuery("");
    setDismissedFor(null);
    setFallback(null);
    setError("");
    // Done searching: close the list rather than showing recents again
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function handleSelectRecent(item: RecentSearch, position: number) {
    handleSelect({ id: position, label: item.label, kind: item.kind, location: item.location });
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  return (
    <>
      {open &&
        createPortal(
          <div
            className="search-backdrop"
            aria-hidden="true"
            onClick={() => setDismissedFor(query)}
          />,
          document.body
        )}

      <div className={open ? "search is-open" : "search"}>
        <input
          type="search"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            // Another search box may have added one since this list was read
            setRecent(getRecentSearches());
            setFocused(true);
            setDismissedFor(null);
          }}
          onBlur={(e) => {
            // Keep the list while focus moves inside it (e.g. tabbing to an item)
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) {
              setFocused(false);
            }
          }}
          placeholder={placeholder}
          aria-label={label}
          aria-expanded={open}
        />

        {open && (
          // mousedown would blur the input before the click lands
          <div className="search-panel" onMouseDown={(e) => e.preventDefault()}>
            {showRecent && (
              <div className="search-recent">
                <div className="search-recent-head">
                  <span>Recent</span>
                  <button type="button" className="search-recent-clear" onClick={handleClearRecent}>
                    Clear
                  </button>
                </div>
                <ul className="search-results">
                  {recent.map((item, position) => (
                    <li key={`${item.kind ?? "city"}-${item.label}`}>
                      <button
                        type="button"
                        className="search-result"
                        onClick={() => handleSelectRecent(item, position)}
                      >
                        <span className="search-result-label">
                          <svg
                            className="search-recent-icon"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <polyline points="12 7 12 12 15 14" />
                          </svg>
                          {item.label}
                        </span>
                        {item.kind && item.kind !== "city" && (
                          <span className="search-result-tag">{KIND_TAGS[item.kind]}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="error-text search-message">{error}</p>}

            {showNoMatches && <p className="muted small search-message">No matches</p>}

            {suggestions.length > 0 && (
              <ul className="search-results">
                {suggestions.map((s) => (
                  <li key={`${s.kind ?? "city"}-${s.id}`}>
                    <button type="button" className="search-result" onClick={() => handleSelect(s)}>
                      <span className="search-result-label">{s.label}</span>
                      {s.kind && s.kind !== "city" && (
                        <span className="search-result-tag">{KIND_TAGS[s.kind]}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default LocationSearch;
