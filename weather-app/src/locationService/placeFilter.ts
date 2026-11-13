import type { GeocodingResult } from "./locationTypes";

// Fallback search only (used when the built-in place list can't load).
// Same rules as the built-in list, as far as Open-Meteo allows:
// cities need at least this many people; states and countries always count.
export const MIN_POPULATION = 100_000;

// GeoNames feature codes for first-level divisions and countries.
const ALWAYS_INCLUDED_CODES = new Set(["ADM1", "PCLI", "PCLD", "PCLF", "PCLS", "PCLIX", "PCL"]);

// Historical, abandoned or destroyed places are never suggested.
const EXCLUDED_CODES = new Set(["PPLH", "PPLQ", "PPLW", "PPLCH"]);

function populationOf(result: GeocodingResult): number {
  return result.population ?? 0;
}

export function isNotablePlace(result: GeocodingResult): boolean {
  const code = result.feature_code ?? "";
  if (EXCLUDED_CODES.has(code)) return false;
  if (ALWAYS_INCLUDED_CODES.has(code)) return true;

  return populationOf(result) >= MIN_POPULATION;
}

// Keeps qualifying places only and lists the biggest first.
export function filterAndRankPlaces(results: GeocodingResult[]): GeocodingResult[] {
  return results
    .filter(isNotablePlace)
    .sort((a, b) => populationOf(b) - populationOf(a));
}
