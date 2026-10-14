import { describe, expect, it } from "vitest";
import { buildPlaceLabel, makePlace } from "../../locationService/placeLabel";

describe("buildPlaceLabel", () => {
  it("joins place, region and country", () => {
    expect(buildPlaceLabel(["Ottawa", "Ontario", "Canada"])).toBe("Ottawa, Ontario, Canada");
  });

  it("removes repeated parts", () => {
    expect(buildPlaceLabel(["Lagos", "Lagos", "Nigeria"])).toBe("Lagos, Nigeria");
  });

  it("skips missing parts", () => {
    expect(buildPlaceLabel(["Lagos", undefined, "Nigeria"])).toBe("Lagos, Nigeria");
  });
});

describe("makePlace", () => {
  it("builds 'City, Country' and keeps the country code", () => {
    expect(makePlace("Lagos", "NG", "Nigeria")).toEqual({
      name: "Lagos, Nigeria",
      countryCode: "NG",
    });
  });

  it("gives the same country name whichever service supplied it", () => {
    const fromReverseGeocoder = makePlace(
      "London",
      "GB",
      "United Kingdom of Great Britain and Northern Ireland (the)"
    );
    const fromSearch = makePlace("London", "GB", "United Kingdom");

    expect(fromReverseGeocoder.name).toBe("London, United Kingdom");
    expect(fromSearch.name).toBe("London, United Kingdom");
  });

  it("uses the supplied country name when there is no code", () => {
    expect(makePlace("Accra", undefined, "Ghana")).toEqual({ name: "Accra, Ghana" });
  });

  it("shows just the city when there is no country", () => {
    expect(makePlace("Lagos")).toEqual({ name: "Lagos" });
  });

  it("does not repeat a city that is also the country", () => {
    expect(makePlace("Singapore", "SG", "Singapore").name).toBe("Singapore");
  });
});
