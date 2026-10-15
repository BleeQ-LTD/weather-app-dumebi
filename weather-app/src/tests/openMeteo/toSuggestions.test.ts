import { describe, expect, it } from "vitest";
import { toSuggestions, type GeocodingResult } from "../../locationService/locationService";

const make = (over: Partial<GeocodingResult> & { id: number }): GeocodingResult =>
  ({
    name: "Abuja",
    admin1: "FCT",
    country: "Nigeria",
    country_code: "NG",
    latitude: 9.0765,
    longitude: 7.3986,
    ...over,
  }) as GeocodingResult;

describe("toSuggestions", () => {
  it("shows one suggestion per city and country", () => {
    const result = toSuggestions([
      make({ id: 1 }),
      make({ id: 2, latitude: 9.2, longitude: 7.5 }),
      make({ id: 3, admin1: "Borno State", latitude: 11.8, longitude: 13.1 }),
      make({ id: 4, admin1: "Ashanti Region", country: "Ghana", country_code: "GH", latitude: 6.7, longitude: -1.6 }),
      make({ id: 5, admin1: "Ashanti Region", country: "Ghana", country_code: "GH", latitude: 6.75, longitude: -1.55 }),
    ]);

    expect(result.map((r) => r.label)).toEqual(["Abuja, Nigeria", "Abuja, Ghana"]);
    expect(result.map((r) => r.id)).toEqual([1, 4]);
  });

  it("uses the same 'City, Country' format as My Location", () => {
    const [first] = toSuggestions([make({ id: 1, name: "Lagos", admin1: "Lagos" })]);

    expect(first.label).toBe("Lagos, Nigeria");
    expect(first.location).toEqual({
      name: "Lagos, Nigeria",
      countryCode: "NG",
      latitude: 9.0765,
      longitude: 7.3986,
    });
  });

  it("keeps cities with the same name in different countries", () => {
    const result = toSuggestions([
      make({ id: 1, name: "London", country: "United Kingdom", country_code: "GB" }),
      make({ id: 2, name: "London", country: "Canada", country_code: "CA", latitude: 42.98, longitude: -81.25 }),
    ]);

    expect(result.map((r) => r.label)).toEqual(["London, United Kingdom", "London, Canada"]);
  });

  it("returns at most 6 suggestions", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      make({ id: i, name: `Town${i}`, latitude: 5 + i, longitude: 5 + i })
    );
    expect(toSuggestions(many)).toHaveLength(6);
  });
});
