import { useEffect, useMemo, useState } from "react";
import { searchPlaces } from "../locationService/locationService";
import {
  loadPlaceIndex,
  searchIndex,
  type IndexedPlace,
} from "../locationService/placeIndex";
import type { Location, PlaceSuggestion } from "../locationService/locationTypes";

interface LocationSearchProps {
  onSelect: (location: Location) => void;
}

// Open-Meteo only matches from 3 characters (fallback search only).
const FALLBACK_MIN_LENGTH = 3;

const KIND_TAGS = { state: "State", country: "Country" } as const;

function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");

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

  function handleSelect(suggestion: PlaceSuggestion) {
    onSelect(suggestion.location); // coordinates are already included
    setQuery("");
    setFallback(null);
    setError("");
  }

  return (
    <div className="search">
      <input
        type="search"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a city"
        aria-label="Search for a city"
      />

      {error && trimmed && <p className="error-text">{error}</p>}

      {searched && !error && suggestions.length === 0 && (
        <p className="muted small">No matches</p>
      )}

      {trimmed && suggestions.length > 0 && (
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
  );
}

export default LocationSearch;
