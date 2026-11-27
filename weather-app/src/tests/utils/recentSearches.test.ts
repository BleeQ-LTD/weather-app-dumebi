import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RECENT,
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "../../utils/recentSearches";
import type { PlaceSuggestion } from "../../locationService/locationTypes";

function fakeStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

const place = (name: string, lat: number, kind?: PlaceSuggestion["kind"]): PlaceSuggestion => ({
  id: lat,
  label: `${name}, Nigeria`,
  kind,
  location: { name: `${name}, Nigeria`, latitude: lat, longitude: 3, countryCode: "NG" },
});

beforeEach(() => {
  fakeStorage();
});
afterEach(() => vi.unstubAllGlobals());

describe("recent searches", () => {
  it("starts empty and keeps the newest first", () => {
    expect(getRecentSearches()).toEqual([]);
    addRecentSearch(place("Lagos", 6.45));
    addRecentSearch(place("Abuja", 9.05));
    expect(getRecentSearches().map((r) => r.label)).toEqual(["Abuja, Nigeria", "Lagos, Nigeria"]);
  });

  it("moves a repeat to the top instead of listing it twice", () => {
    addRecentSearch(place("Lagos", 6.45));
    addRecentSearch(place("Abuja", 9.05));
    addRecentSearch(place("Lagos", 6.45));
    expect(getRecentSearches().map((r) => r.label)).toEqual(["Lagos, Nigeria", "Abuja, Nigeria"]);
  });

  it("keeps a city and the state of the same name apart", () => {
    addRecentSearch(place("Lagos", 6.45));
    addRecentSearch(place("Lagos", 6.6, "state"));
    expect(getRecentSearches().map((r) => r.kind ?? "city")).toEqual(["state", "city"]);
  });

  it(`keeps only the last ${MAX_RECENT}`, () => {
    for (let i = 0; i < 8; i++) addRecentSearch(place(`Town${i}`, 10 + i));
    const labels = getRecentSearches().map((r) => r.label);
    expect(labels).toHaveLength(MAX_RECENT);
    expect(labels[0]).toBe("Town7, Nigeria");
  });

  it("clears, and ignores damaged saved data", () => {
    addRecentSearch(place("Lagos", 6.45));
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);

    localStorage.setItem("weather-app-recent-searches", "{broken");
    expect(getRecentSearches()).toEqual([]);
    localStorage.setItem("weather-app-recent-searches", JSON.stringify([{ label: 1 }, null]));
    expect(getRecentSearches()).toEqual([]);
  });
});
