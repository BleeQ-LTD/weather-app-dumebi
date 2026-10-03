import { useEffect, useState } from "react";
import { searchPlaces } from "../locationService/locationService";
import type { Location, PlaceSuggestion } from "../locationService/locationTypes";

interface LocationSearchProps {
  onSelect: (location: Location) => void;
}

function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Open-Meteo gives fuzzy matches from 3 characters
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    // Debounce: wait 300ms after the last keystroke before searching
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(query.trim());
        if (!cancelled) {
          setSuggestions(results);
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
  }, [query]);

  function handleSelect(suggestion: PlaceSuggestion) {
    onSelect(suggestion.location); // coordinates are already included
    setQuery("");
    setSuggestions([]);
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

      {error && <p className="error-text">{error}</p>}

      {query.trim().length >= 3 && !error && suggestions.length === 0 && (
        <p className="muted small">No matches yet...</p>
      )}

      {suggestions.length > 0 && (
        <ul className="search-results">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button type="button" className="search-result" onClick={() => handleSelect(s)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationSearch;
