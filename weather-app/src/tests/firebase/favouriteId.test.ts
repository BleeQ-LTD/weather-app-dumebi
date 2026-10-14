import { describe, expect, it } from "vitest";
import { isSamePlace, makeFavouriteId } from "../../firebaseService/favouriteId";

describe("makeFavouriteId", () => {
  it("is built from the city and country code", () => {
    expect(makeFavouriteId({ name: "Lagos, Nigeria", countryCode: "NG" })).toBe("lagos_ng");
  });

  it("is built from the city and country name for older saves", () => {
    expect(makeFavouriteId({ name: "Ottawa, Ontario, Canada" })).toBe("ottawa_canada");
  });

  it("ignores coordinates, so the same city always gets the same id", () => {
    const a = { name: "Lagos, Nigeria", countryCode: "NG", latitude: 6.45, longitude: 3.39 };
    const b = { name: "Lagos, Nigeria", countryCode: "NG", latitude: 6.6, longitude: 3.35 };
    expect(makeFavouriteId(a)).toBe(makeFavouriteId(b));
  });

  it("removes accents and symbols", () => {
    expect(makeFavouriteId({ name: "São Paulo, Brazil" })).toBe("sao-paulo_brazil");
  });
});

describe("isSamePlace", () => {
  it("matches the same city and country even when the points are far apart", () => {
    const searched = { name: "Lagos, Nigeria", countryCode: "NG", latitude: 6.4541, longitude: 3.3947 };
    const mine = { name: "Lagos, Nigeria", countryCode: "NG", latitude: 6.7, longitude: 3.3 };
    expect(isSamePlace(searched, mine)).toBe(true);
  });

  it("matches an older save without a country", () => {
    expect(isSamePlace({ name: "Lagos" }, { name: "Lagos, Nigeria", countryCode: "NG" })).toBe(true);
  });

  it("matches an older 'City, Region, Country' save by city and country", () => {
    expect(
      isSamePlace({ name: "Ottawa, Ontario, Canada" }, { name: "Ottawa, Canada", countryCode: "CA" })
    ).toBe(true);
  });

  it("matches the unnamed My Location against a saved city at the same spot", () => {
    const mine = { name: "My Location", latitude: 6.5244, longitude: 3.3792 };
    const saved = { name: "Lagos, Nigeria", latitude: 6.5244, longitude: 3.3792 };
    expect(isSamePlace(mine, saved)).toBe(true);
  });

  it("does not match the same city name in different countries", () => {
    expect(
      isSamePlace(
        { name: "Abuja, Nigeria", countryCode: "NG" },
        { name: "Abuja, Ghana", countryCode: "GH" }
      )
    ).toBe(false);
  });

  it("does not match different cities", () => {
    const accra = { name: "Accra, Ghana", latitude: 5.556, longitude: -0.197 };
    const tema = { name: "Tema, Ghana", latitude: 5.667, longitude: -0.017 };
    expect(isSamePlace(accra, tema)).toBe(false);
  });
});
