import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLACE_NAME,
  FALLBACK_LOCATION,
  getCurrentCoordinates,
  getPlaceName,
  locateUser,
} from "../../locationService/geolocationService";

type SuccessCallback = (position: unknown) => void;
type ErrorCallback = (error: { code: number }) => void;

function stubGeolocationSuccess(latitude: number, longitude: number) {
  const getCurrentPosition = vi.fn(
    (success: SuccessCallback, _error?: ErrorCallback, _options?: unknown) =>
      success({ coords: { latitude, longitude } })
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

function stubGeolocationError(code: number) {
  const getCurrentPosition = vi.fn((_success: SuccessCallback, error?: ErrorCallback) =>
    error?.({ code })
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

// A request that never gets an answer
function stubFetchThatNeverAnswers() {
  const fetchMock = vi.fn((_url: string, _init?: { signal?: AbortSignal }) => new Promise(() => {}));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
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

describe("getPlaceName timeout (a stalled lookup must not hang)", () => {
  it("gives up with null after 4 seconds if the lookup never answers", async () => {
    vi.useFakeTimers();
    stubFetchThatNeverAnswers();

    let settled = false;
    const result = getPlaceName(6.4281, 3.4219).then((name) => {
      settled = true;
      return name;
    });

    await vi.advanceTimersByTimeAsync(3999);
    expect(settled).toBe(false); // still waiting just before 4 seconds

    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeNull();
    expect(settled).toBe(true);
  });

  it("cancels the request when it gives up", async () => {
    vi.useFakeTimers();
    const fetchMock = stubFetchThatNeverAnswers();

    const result = getPlaceName(6.4281, 3.4219, 50);
    await vi.advanceTimersByTimeAsync(50);
    await result;

    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("returns a quick answer without waiting for the timeout", async () => {
    mockFetch({ city: "Lagos" });

    // Real timers: this would take 4 seconds if it waited for the timeout
    expect(await getPlaceName(6.4281, 3.4219)).toBe("Lagos");
  });
});

describe("locateUser (the weather can load before the name is known)", () => {
  it("reports the position straight away, even while the name lookup is stalled", async () => {
    vi.useFakeTimers();
    stubGeolocationSuccess(6.4281, 3.4219);
    stubFetchThatNeverAnswers();
    const onLocation = vi.fn();

    const finished = locateUser(onLocation);
    await vi.advanceTimersByTimeAsync(0); // let the position arrive; the name lookup is still stuck

    expect(onLocation).toHaveBeenCalledTimes(1);
    expect(onLocation).toHaveBeenLastCalledWith({
      name: DEFAULT_PLACE_NAME,
      latitude: 6.4281,
      longitude: 3.4219,
    });

    // Once the lookup times out, it finishes without ever reporting a name
    await vi.advanceTimersByTimeAsync(4000);
    await finished;
    expect(onLocation).toHaveBeenCalledTimes(1);
  });

  it("reports the position first, then the same position with its name", async () => {
    stubGeolocationSuccess(6.4281, 3.4219);
    mockFetch({ city: "Lagos" });
    const onLocation = vi.fn();

    await locateUser(onLocation);

    expect(onLocation).toHaveBeenCalledTimes(2);
    expect(onLocation).toHaveBeenNthCalledWith(1, {
      name: DEFAULT_PLACE_NAME,
      latitude: 6.4281,
      longitude: 3.4219,
    });
    expect(onLocation).toHaveBeenNthCalledWith(2, {
      name: "Lagos",
      latitude: 6.4281,
      longitude: 3.4219,
    });
  });

  it("keeps working, as 'My Location', when the name lookup fails", async () => {
    stubGeolocationSuccess(6.4281, 3.4219);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const onLocation = vi.fn();

    await locateUser(onLocation);

    expect(onLocation).toHaveBeenCalledTimes(1);
    expect(onLocation).toHaveBeenLastCalledWith({
      name: DEFAULT_PLACE_NAME,
      latitude: 6.4281,
      longitude: 3.4219,
    });
  });

  it("rejects, without reporting any location, when permission is denied", async () => {
    stubGeolocationError(1);
    const onLocation = vi.fn();

    await expect(locateUser(onLocation)).rejects.toThrow("permission was denied");
    expect(onLocation).not.toHaveBeenCalled();
  });
});
