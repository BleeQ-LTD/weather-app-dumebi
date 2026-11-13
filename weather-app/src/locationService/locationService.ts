import type { PlaceSuggestion, GeocodingResponse, Location } from "./locationTypes";
import { makePlace } from "./placeLabel";
import { isSamePlace } from "../firebaseService/favouriteId";
import { filterAndRankPlaces } from "./placeFilter";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// Ask for extra results, because several records describe the same city
const FETCH_COUNT = 15;
const MAX_RESULTS = 8;

export type GeocodingResult = NonNullable<GeocodingResponse["results"]>[number];

// Pure function (no network), so it can be tested directly.
// One suggestion per city and country, in the API's order.
export function toSuggestions(results: GeocodingResult[]): PlaceSuggestion[] {
  const suggestions: PlaceSuggestion[] = [];

  for (const result of results) {
    const place = makePlace(result.name, result.country_code, result.country);
    const location: Location = {
      ...place,
      latitude: result.latitude,
      longitude: result.longitude,
    };

    const code = result.feature_code ?? "";
    const kind = code === "ADM1" ? "state" : code.startsWith("PCL") ? "country" : "city";

    // One per place and kind: Lagos the city and Lagos State are both shown
    if (suggestions.some((s) => s.kind === kind && isSamePlace(s.location, location))) continue;

    suggestions.push({ id: result.id, label: place.name, location, kind });
    if (suggestions.length === MAX_RESULTS) break;
  }

  return suggestions;
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

  // A text value is iterable, so it would otherwise be read letter by letter
  if (data.results !== undefined && !Array.isArray(data.results)) {
    throw new Error("Unexpected response from the geocoding service.");
  }

  // Same rules as the built-in list: cities of 100,000+, every state and
  // country, biggest first.
  return toSuggestions(filterAndRankPlaces(data.results ?? []));
}
