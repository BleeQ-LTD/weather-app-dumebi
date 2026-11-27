import type { Location, PlaceKind, PlaceSuggestion } from "../locationService/locationTypes";
import { isSamePlace } from "../firebaseService/favouriteId";

// The last few places picked from search, on this device only, newest first.
const RECENT_KEY = "weather-app-recent-searches";
export const MAX_RECENT = 5;

export interface RecentSearch {
  label: string;
  kind?: PlaceKind;
  location: Location;
}

function isRecent(value: unknown): value is RecentSearch {
  const item = value as RecentSearch;
  return (
    typeof item?.label === "string" &&
    typeof item.location?.name === "string" &&
    Number.isFinite(item.location?.latitude) &&
    Number.isFinite(item.location?.longitude)
  );
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isRecent).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function store(list: RecentSearch[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Unable to save recent searches:", error);
  }
}

// Puts the place at the top; the same place picked again moves up instead of
// appearing twice. (A city and the state of the same name are different.)
export function addRecentSearch(suggestion: PlaceSuggestion): RecentSearch[] {
  const entry: RecentSearch = {
    label: suggestion.label,
    kind: suggestion.kind,
    location: suggestion.location,
  };

  const rest = getRecentSearches().filter(
    (item) =>
      !((item.kind ?? "city") === (entry.kind ?? "city") && isSamePlace(item.location, entry.location))
  );

  const next = [entry, ...rest].slice(0, MAX_RECENT);
  store(next);
  return next;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // nothing saved anyway
  }
}
