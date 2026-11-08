import type { GeocodingResult } from "./locationTypes";

// Places with fewer inhabitants than this are hidden from the suggestions,
// unless they are a capital or a major administrative seat.
export const MIN_POPULATION = 1000;

// GeoNames feature codes: capital, first-order seat and second-order seat.
const MAJOR_PLACE_CODES = new Set(["PPLC", "PPLA", "PPLA2"]);

function populationOf(result: GeocodingResult): number {
  return result.population ?? 0;
}

export function isNotablePlace(result: GeocodingResult): boolean {
  if (result.feature_code && MAJOR_PLACE_CODES.has(result.feature_code)) {
    return true;
  }

  return populationOf(result) >= MIN_POPULATION;
}

// Hides tiny hamlets and unclassified entries and lists the biggest places first.
// If nothing qualifies (for example someone searches for a small village), the
// original results are returned so a real small place can still be found.
export function filterAndRankPlaces(results: GeocodingResult[]): GeocodingResult[] {
  const notable = results.filter(isNotablePlace);

  if (notable.length === 0) return results;

  return [...notable].sort((a, b) => populationOf(b) - populationOf(a));
}
