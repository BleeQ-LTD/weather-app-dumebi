import { describe, expect, it } from "vitest";
import { buildIndex, normaliseForSearch, searchIndex } from "../../locationService/placeIndex";

// [name, countryCode, kind (0 city, 1 state, 2 country), lat, lon, population, aliases?]
const index = buildIndex([
  ["Lahore", "PK", 0, 31.55, 74.34, 11_000_000],
  ["Lagos", "NG", 1, 6.6, 3.34, 10_456_225, ["Lagos State"]],
  ["Lagos", "NG", 0, 6.45, 3.39, 9_000_000],
  ["London", "GB", 0, 51.5, -0.12, 8_900_000],
  ["Libya", "LY", 2, 32.9, 13.2, 6_800_000],
  ["São Paulo", "BR", 0, -23.5, -46.6, 10_021_295],
  ["Edo", "NG", 1, 6.34, 5.63, 1_420_610, ["Edo State"]],
  ["Lafia", "NG", 0, 8.49, 8.52, 330_000],
  ["Las Vegas", "US", 0, 36.17, -115.14, 640_000],
  ["Lyon", "FR", 0, 45.75, 4.85, 500_000],
  ["Leeds", "GB", 0, 53.8, -1.55, 455_000],
  ["Lille", "FR", 0, 50.63, 3.06, 230_000],
  ["Luton", "GB", 0, 51.88, -0.42, 210_000],
].sort((a, b) => (b[5] as number) - (a[5] as number)) as Parameters<typeof buildIndex>[0]);

describe("TC-SRCH-010 built-in place search", () => {
  it("suggests from the first letter, biggest first, at most 8", () => {
    const results = searchIndex(index, "L");
    expect(results).toHaveLength(8);
    expect(results[0].label).toBe("Lahore, Pakistan");
  });

  it("narrows as more letters are typed", () => {
    expect(searchIndex(index, "La").map((r) => r.label)).toEqual([
      "Lahore, Pakistan",
      "Lagos, Nigeria",
      "Lagos, Nigeria",
      "Las Vegas, United States",
      "Lafia, Nigeria",
    ]);
  });

  it("only matches the start of the name", () => {
    expect(searchIndex(index, "Vegas")).toEqual([]);
    expect(searchIndex(index, "agos")).toEqual([]);
  });

  it("puts exact matches first: city, then state", () => {
    const [first, second] = searchIndex(index, "lagos");
    expect([first.kind, second.kind]).toEqual(["city", "state"]);
  });

  it("finds states by short and full name, labelled without 'State'", () => {
    for (const typed of ["Ed", "Edo", "Edo State", "edo s"]) {
      const [edo] = searchIndex(index, typed);
      expect(edo.label).toBe("Edo, Nigeria");
      expect(edo.kind).toBe("state");
    }
  });

  it("labels countries with just the country name", () => {
    const [libya] = searchIndex(index, "Liby");
    expect(libya).toMatchObject({ label: "Libya", kind: "country" });
    expect(libya.location.countryCode).toBe("LY");
  });

  it("ignores case and accents", () => {
    expect(searchIndex(index, "SAO PA")[0].label).toBe("São Paulo, Brazil");
    expect(normaliseForSearch("  Saint-Étienne ")).toBe("saint etienne");
  });

  it("returns nothing for empty text", () => {
    expect(searchIndex(index, "   ")).toEqual([]);
  });
});
