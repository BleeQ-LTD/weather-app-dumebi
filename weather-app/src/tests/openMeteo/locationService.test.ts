import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "../../locationService/locationService";

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return new URL(fetchMock.mock.calls[0][0] as string);
}

const lagosResult = {
  id: 2332459,
  name: "Lagos",
  latitude: 6.45306,
  longitude: 3.39583,
  admin1: "Lagos",
  country: "Nigeria",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TC-OM-003 geocoding API", () => {
  it("calls the search endpoint with the city name", async () => {
    const fetchMock = mockFetch({ results: [lagosResult] });

    await searchPlaces("Lagos");

    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(url.searchParams.get("name")).toBe("Lagos");
    expect(url.searchParams.get("count")).toBe("5");
    expect(url.searchParams.get("language")).toBe("en");
  });

  it("returns a match with a name and numeric latitude/longitude", async () => {
    mockFetch({ results: [lagosResult] });

    const [place] = await searchPlaces("Lagos");

    expect(place.id).toBe(2332459);
    expect(place.location.name).toContain("Lagos");
    expect(typeof place.location.latitude).toBe("number");
    expect(typeof place.location.longitude).toBe("number");
    expect(place.location.latitude).toBeCloseTo(6.45306);
    expect(place.location.longitude).toBeCloseTo(3.39583);
    // WGS84 latitude/longitude ranges
    expect(Math.abs(place.location.latitude)).toBeLessThanOrEqual(90);
    expect(Math.abs(place.location.longitude)).toBeLessThanOrEqual(180);
  });

  it("builds a readable label and drops a region that repeats the city name", async () => {
    mockFetch({ results: [lagosResult] });

    const [place] = await searchPlaces("Lagos");

    expect(place.label).toBe("Lagos, Nigeria");
    expect(place.location.name).toBe("Lagos, Nigeria");
  });

  it("includes the region when it differs from the city name", async () => {
    mockFetch({
      results: [
        { id: 1, name: "Paris", latitude: 48.85, longitude: 2.35, admin1: "Île-de-France", country: "France" },
      ],
    });

    const [place] = await searchPlaces("Paris");

    expect(place.label).toBe("Paris, Île-de-France, France");
  });

  it("copes with missing region and country", async () => {
    mockFetch({ results: [{ id: 9, name: "Atlantis", latitude: 1, longitude: 2 }] });

    const [place] = await searchPlaces("Atlantis");

    expect(place.label).toBe("Atlantis");
  });

  it("handles multiple matching locations, keeping their order", async () => {
    mockFetch({
      results: [
        { id: 1, name: "Springfield", latitude: 39.8, longitude: -89.6, admin1: "Illinois", country: "United States" },
        { id: 2, name: "Springfield", latitude: 37.2, longitude: -93.3, admin1: "Missouri", country: "United States" },
        { id: 3, name: "Springfield", latitude: 42.1, longitude: -72.6, admin1: "Massachusetts", country: "United States" },
      ],
    });

    const places = await searchPlaces("Springfield");

    expect(places.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(places.map((p) => p.label)).toEqual([
      "Springfield, Illinois, United States",
      "Springfield, Missouri, United States",
      "Springfield, Massachusetts, United States",
    ]);
  });
});

describe("TC-OM-004 invalid location search", () => {
  it("returns an empty list when the API has no 'results' (no matches)", async () => {
    mockFetch({ generationtime_ms: 0.5 });

    expect(await searchPlaces("zzzzqqqq")).toEqual([]);
  });

  it("returns an empty list for an empty results array", async () => {
    mockFetch({ results: [] });

    expect(await searchPlaces("zzzzqqqq")).toEqual([]);
  });

  it("encodes special characters so they cannot inject extra query parameters", async () => {
    const fetchMock = mockFetch({});

    await searchPlaces("a&count=100");

    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get("name")).toBe("a&count=100");
    expect(url.searchParams.get("count")).toBe("5");
  });

  it("encodes non-ASCII city names", async () => {
    const fetchMock = mockFetch({});

    await searchPlaces("São Paulo");

    expect(fetchMock.mock.calls[0][0]).toContain("S%C3%A3o%20Paulo");
    expect(requestedUrl(fetchMock).searchParams.get("name")).toBe("São Paulo");
  });
});

describe("TC-OM-007 geocoding API failure", () => {
  it("throws with the status on an HTTP error", async () => {
    mockFetch({}, { ok: false, status: 500 });

    await expect(searchPlaces("Lagos")).rejects.toThrow("status 500");
  });

  it("rejects when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(searchPlaces("Lagos")).rejects.toThrow("Failed to fetch");
  });

  it("rejects when the response has an unexpected shape", async () => {
    mockFetch({ results: "not-an-array" });

    await expect(searchPlaces("Lagos")).rejects.toThrow();
  });
});
