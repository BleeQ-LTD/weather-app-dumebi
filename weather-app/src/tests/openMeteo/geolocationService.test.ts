import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_LOCATION,
  getCurrentCoordinates,
  getCurrentLocation,
  getPlaceName,
} from "../../locationService/geolocationService";

function stubGeolocationSuccess(latitude: number, longitude: number) {
  const getCurrentPosition = vi.fn((success: (p: unknown) => void) =>
    success({ coords: { latitude, longitude } })
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

function stubGeolocationError(code: number) {
  const getCurrentPosition = vi.fn(
    (_success: unknown, failure: (e: { code: number }) => void) => failure({ code })
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
}

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FALLBACK_LOCATION", () => {
  it("is Lagos", () => {
    expect(FALLBACK_LOCATION).toEqual({ name: "Lagos", latitude: 6.5244, longitude: 3.3792 });
  });
});

describe("getCurrentCoordinates", () => {
  it("resolves with the device's latitude and longitude", async () => {
    stubGeolocationSuccess(6.4281, 3.4219);

    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 6.4281,
      longitude: 3.4219,
    });
  });

  it("allows a cached position and gives up after 10 seconds", async () => {
    const getCurrentPosition = stubGeolocationSuccess(6.4281, 3.4219);

    await getCurrentCoordinates();

    const options = getCurrentPosition.mock.calls[0][2] as { timeout: number; maximumAge: number };
    expect(options.timeout).toBe(10000);
    expect(options.maximumAge).toBeGreaterThan(0);
  });

  it.each([
    [1, "Location permission was denied."],
    [2, "Your location is unavailable."],
    [3, "Finding your location timed out."],
    [99, "Could not get your location."],
  ])("turns geolocation error code %i into a readable message", async (code, message) => {
    stubGeolocationError(code);

    await expect(getCurrentCoordinates()).rejects.toThrow(message);
  });

  it("rejects when the browser has no geolocation support", async () => {
    vi.stubGlobal("navigator", {});

    await expect(getCurrentCoordinates()).rejects.toThrow("not supported");
  });
});

describe("getPlaceName", () => {
  it("asks the reverse-geocoding service about the coordinates", async () => {
    const fetchMock = mockFetch({ city: "Lagos" });

    await getPlaceName(6.4281, 3.4219);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    );
    expect(url.searchParams.get("latitude")).toBe("6.4281");
    expect(url.searchParams.get("longitude")).toBe("3.4219");
  });

  it("prefers the city name", async () => {
    mockFetch({ city: "Lagos", locality: "Ikoyi", principalSubdivision: "Lagos State" });

    expect(await getPlaceName(6.4281, 3.4219)).toBe("Lagos");
  });

  it("falls back to locality, then to region", async () => {
    mockFetch({ city: "", locality: "Ikoyi", principalSubdivision: "Lagos State" });
    expect(await getPlaceName(6.4281, 3.4219)).toBe("Ikoyi");

    mockFetch({ city: "", locality: "", principalSubdivision: "Lagos State" });
    expect(await getPlaceName(6.4281, 3.4219)).toBe("Lagos State");
  });

  it("returns null when there is no usable name", async () => {
    mockFetch({ city: "", locality: "" });

    expect(await getPlaceName(0, 0)).toBeNull();
  });

  it("returns null on an HTTP error instead of throwing", async () => {
    mockFetch({}, { ok: false, status: 402 });

    expect(await getPlaceName(6.4281, 3.4219)).toBeNull();
  });

  it("returns null when the network fails instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect(await getPlaceName(6.4281, 3.4219)).toBeNull();
  });
});

describe("getCurrentLocation", () => {
  it("combines the device position with the place name", async () => {
    stubGeolocationSuccess(6.4281, 3.4219);
    mockFetch({ city: "Lagos" });

    expect(await getCurrentLocation()).toEqual({
      name: "Lagos",
      latitude: 6.4281,
      longitude: 3.4219,
    });
  });

  it("still works, calling it 'My Location', when the name lookup fails", async () => {
    stubGeolocationSuccess(6.4281, 3.4219);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect(await getCurrentLocation()).toEqual({
      name: "My Location",
      latitude: 6.4281,
      longitude: 3.4219,
    });
  });

  it("rejects when permission is denied", async () => {
    stubGeolocationError(1);

    await expect(getCurrentLocation()).rejects.toThrow("permission was denied");
  });
});
