import { describe, expect, it } from "vitest";
import {
  MIN_POPULATION,
  filterAndRankPlaces,
  isNotablePlace,
} from "../../locationService/placeFilter";
import type { GeocodingResult } from "../../locationService/locationTypes";

const make = (over: Partial<GeocodingResult> & { id: number }): GeocodingResult => ({
  name: "Lagos",
  latitude: 6.5,
  longitude: 3.4,
  country: "Nigeria",
  country_code: "NG",
  ...over,
});

describe("TC-SRCH-001 notable places", () => {
  it("keeps a place at the population cutoff and drops one just below it", () => {
    expect(isNotablePlace(make({ id: 1, population: MIN_POPULATION }))).toBe(true);
    expect(isNotablePlace(make({ id: 2, population: MIN_POPULATION - 1 }))).toBe(false);
  });

  it("drops a place with no population and no major status", () => {
    expect(isNotablePlace(make({ id: 1, feature_code: "PPL" }))).toBe(false);
  });

  it.each(["ADM1", "PCLI"])("always keeps states and countries (%s), even with no population", (code) => {
    expect(isNotablePlace(make({ id: 1, feature_code: code }))).toBe(true);
  });

  it("applies the 100,000 rule to capitals and seats too", () => {
    expect(isNotablePlace(make({ id: 1, feature_code: "PPLA", population: 40_000 }))).toBe(false);
    expect(isNotablePlace(make({ id: 2, feature_code: "PPLC", population: 99_999 }))).toBe(false);
  });

  it("never keeps historical or abandoned places", () => {
    expect(isNotablePlace(make({ id: 1, feature_code: "PPLH", population: 500_000 }))).toBe(false);
  });
});

describe("TC-SRCH-002 filtering and ranking", () => {
  it("hides tiny places and lists the biggest first", () => {
    const result = filterAndRankPlaces([
      make({ id: 1, country: "France", country_code: "FR", feature_code: "PPL" }),
      make({ id: 2, country: "Portugal", country_code: "PT", population: 31000 }),
      make({ id: 3, population: 15000000, feature_code: "PPLA" }),
      make({ id: 5, name: "Lagos State", feature_code: "ADM1" }),
      make({ id: 4, country: "Greece", country_code: "GR", population: 120 }),
    ]);

    expect(result.map((r) => r.id)).toEqual([3, 5]);
  });

  it("keeps the original order for places with the same population", () => {
    const result = filterAndRankPlaces([
      make({ id: 1, population: 500_000 }),
      make({ id: 2, population: 500_000 }),
      make({ id: 3, population: 900_000 }),
    ]);

    expect(result.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it("returns nothing when no place qualifies (small places are not suggested)", () => {
    const results = [
      make({ id: 1, name: "Tiny Village", population: 40 }),
      make({ id: 2, name: "Tiny Hamlet" }),
    ];

    expect(filterAndRankPlaces(results)).toEqual([]);
  });

  it("returns an empty list for no results", () => {
    expect(filterAndRankPlaces([])).toEqual([]);
  });

  it("does not change the list it was given", () => {
    const results = [make({ id: 1, population: 5000 }), make({ id: 2, population: 9000 })];
    const copy = [...results];

    filterAndRankPlaces(results);

    expect(results).toEqual(copy);
  });
});
