import type { Location, PlaceKind, PlaceSuggestion } from "./locationTypes";
import { makePlace } from "./placeLabel";

// The built-in list made by scripts/build-places.mjs (GeoNames data).
// Each row: [name, countryCode, kind, latitude, longitude, population, aliases?]
type PlaceRow = [string, string, 0 | 1 | 2, number, number, number, string[]?];

interface PlacesFile {
  version: number;
  places: PlaceRow[];
}

export interface IndexedPlace {
  name: string;
  countryCode: string;
  kind: PlaceKind;
  latitude: number;
  longitude: number;
  population: number;
  keys: string[]; // normalised names that can be typed to find it
}

export const MAX_SUGGESTIONS = 8;

const KINDS: PlaceKind[] = ["city", "state", "country"];
const KIND_ORDER: Record<PlaceKind, number> = { city: 0, state: 1, country: 2 };

// Case and accents don't matter, and punctuation counts as a space:
// "SAO paulo" finds "São Paulo", "st. louis" finds "St Louis".
export function normaliseForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function buildIndex(rows: PlaceRow[]): IndexedPlace[] {
  return rows.map(([name, countryCode, kind, latitude, longitude, population, aliases]) => ({
    name,
    countryCode,
    kind: KINDS[kind] ?? "city",
    latitude,
    longitude,
    population,
    keys: [...new Set([name, ...(aliases ?? [])].map(normaliseForSearch))],
  }));
}

function toSuggestion(place: IndexedPlace, id: number): PlaceSuggestion {
  // Countries are labelled with just the country name ("Nigeria"); cities and
  // states use the usual "Name, Country" ("Edo, Nigeria").
  const label =
    place.kind === "country"
      ? makePlace("", place.countryCode, place.name)
      : makePlace(place.name, place.countryCode);

  const location: Location = {
    ...label,
    latitude: place.latitude,
    longitude: place.longitude,
  };

  return { id, label: label.name, location, kind: place.kind };
}

// Name starts with what was typed. Exact matches first (city, then state, then
// country), then everything else biggest first. The index is already sorted by
// population, so the scan stops as soon as there are enough non-exact matches.
export function searchIndex(
  index: IndexedPlace[],
  input: string,
  limit = MAX_SUGGESTIONS
): PlaceSuggestion[] {
  const query = normaliseForSearch(input);
  if (!query) return [];

  const exact: Array<{ place: IndexedPlace; i: number }> = [];
  const partial: Array<{ place: IndexedPlace; i: number }> = [];

  for (let i = 0; i < index.length; i++) {
    const place = index[i];
    let isExact = false;
    let isMatch = false;

    for (const key of place.keys) {
      if (key === query) {
        isExact = true;
        break;
      }
      if (key.startsWith(query)) isMatch = true;
    }

    if (isExact) exact.push({ place, i });
    else if (isMatch && partial.length < limit * 2) partial.push({ place, i });
  }

  exact.sort(
    (a, b) =>
      KIND_ORDER[a.place.kind] - KIND_ORDER[b.place.kind] ||
      b.place.population - a.place.population
  );

  const results: PlaceSuggestion[] = [];
  const seen = new Set<string>();

  for (const { place, i } of [...exact, ...partial]) {
    const suggestion = toSuggestion(place, i);
    const key = `${suggestion.kind}|${suggestion.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(suggestion);
    if (results.length === limit) break;
  }

  return results;
}

// ---------- Loading (once per page) ----------

let loading: Promise<IndexedPlace[]> | null = null;

export function loadPlaceIndex(): Promise<IndexedPlace[]> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}places.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`places.json failed (status ${response.status})`);
        return response.json() as Promise<PlacesFile>;
      })
      .then((file) => {
        if (!Array.isArray(file?.places)) throw new Error("places.json is not a place list");
        return buildIndex(file.places);
      })
      .catch((error) => {
        loading = null; // allow a retry on the next page load / mount
        throw error;
      });
  }

  return loading;
}
