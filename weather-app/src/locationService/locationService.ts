import type { PlaceSuggestion, GeocodingResponse } from "./locationTypes";
import { isSamePlace } from "../firebaseService/favouriteId";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// Ask for extra results, because duplicates are removed before showing them
const FETCH_COUNT = 15;
const MAX_RESULTS = 6;

export type GeocodingResult = NonNullable<GeocodingResponse["results"]>[number];

function buildLabel(parts: Array<string | undefined>): string {
  return [...new Set(parts)].filter((part): part is string => Boolean(part)).join(", ");
}

function countOf(labels: string[], label: string): number {
  return labels.filter((l) => l === label).length;
}

// Pure function (no network), so it can be tested directly
export function toSuggestions(results: GeocodingResult[]): PlaceSuggestion[] {
  const baseLabel = (r: GeocodingResult) => buildLabel([r.name, r.admin1, r.country]);

  // 1. Drop near-duplicates: same label and within 5 km (API order is kept)
  const unique: GeocodingResult[] = [];
  for (const r of results) {
    if (!unique.some((u) => baseLabel(u) === baseLabel(r) && isSamePlace(u, r))) {
      unique.push(r);
    }
  }
  const shown = unique.slice(0, MAX_RESULTS);

  // 2. Labels that still collide get the district
  const base = shown.map(baseLabel);
  const withDistrict = shown.map((r, i) =>
    countOf(base, base[i]) > 1 ? buildLabel([r.name, r.admin2, r.admin1, r.country]) : base[i]
  );

  // 3. Anything still colliding gets its coordinates
  const labels = withDistrict.map((label, i) =>
    countOf(withDistrict, label) > 1
      ? `${label} (${shown[i].latitude.toFixed(2)}, ${shown[i].longitude.toFixed(2)})`
      : label
  );

  return shown.map((r, i) => ({
    id: r.id,
    label: labels[i],
    location: {
      name: labels[i],
      latitude: r.latitude,
      longitude: r.longitude,
    },
  }));
}

export async function searchPlaces(input: string): Promise<PlaceSuggestion[]> {
  const url =
    `${GEOCODING_URL}?name=${encodeURIComponent(input)}` +
    `&count=${FETCH_COUNT}` +
    `&language=en`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search places (status ${response.status})`);
  }

  const data: GeocodingResponse = await response.json();

  return toSuggestions(data.results ?? []);
}