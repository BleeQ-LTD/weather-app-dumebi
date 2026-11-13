import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFavouriteWeatherCache,
  FAVOURITE_WEATHER_TTL_MS,
  getFavouritesWeather,
} from "../../weatherService/favouriteWeather";

const LAGOS = { latitude: 6.5244, longitude: 3.3792 };
const ABUJA = { latitude: 9.0765, longitude: 7.3986 };
const LONDON = { latitude: 51.5072, longitude: -0.1276 };

function placeBody(temperature: number, weatherCode = 3, isDay = 1) {
  return { current: { temperature_2m: temperature, weather_code: weatherCode, is_day: isDay } };
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

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(fetchMock.mock.calls[call][0] as string);
}

beforeEach(() => clearFavouriteWeatherCache());
afterEach(() => vi.unstubAllGlobals());

describe("TC-OM-008 weather for the Favourites list", () => {
  it("asks for every place in one request", async () => {
    const fetchMock = mockFetch([placeBody(30), placeBody(27)]);

    await getFavouritesWeather([LAGOS, ABUJA]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get("latitude")).toBe("6.52,9.08");
    expect(url.searchParams.get("longitude")).toBe("3.38,7.40");
    expect(url.searchParams.get("current")).toBe("temperature_2m,weather_code,is_day");
  });

  it("returns results in the same order as the places it was given", async () => {
    mockFetch([placeBody(30, 3, 1), placeBody(27, 61, 0)]);

    const results = await getFavouritesWeather([LAGOS, ABUJA]);

    expect(results).toEqual([
      { temperature: 30, weatherCode: 3, isDay: true },
      { temperature: 27, weatherCode: 61, isDay: false },
    ]);
  });

  it("copes with a single place, which Open-Meteo returns as one object", async () => {
    mockFetch(placeBody(29));

    const results = await getFavouritesWeather([LAGOS]);

    expect(results).toEqual([{ temperature: 29, weatherCode: 3, isDay: true }]);
  });

  it("reuses a result instead of asking again within five minutes", async () => {
    const fetchMock = mockFetch(placeBody(29));
    const start = 1_000_000;

    await getFavouritesWeather([LAGOS], start);
    const again = await getFavouritesWeather([LAGOS], start + FAVOURITE_WEATHER_TTL_MS - 1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(again[0]?.temperature).toBe(29);
  });

  it("asks again once the result is five minutes old", async () => {
    const fetchMock = mockFetch(placeBody(29));
    const start = 1_000_000;

    await getFavouritesWeather([LAGOS], start);
    await getFavouritesWeather([LAGOS], start + FAVOURITE_WEATHER_TTL_MS);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("only asks for the places that are not cached yet", async () => {
    mockFetch(placeBody(29));
    await getFavouritesWeather([LAGOS]);

    // Only London is missing, so Open-Meteo is asked about one place and answers with one object
    const secondFetch = mockFetch(placeBody(15));
    const results = await getFavouritesWeather([LAGOS, LONDON]);

    expect(results.map((r) => r?.temperature)).toEqual([29, 15]);
    expect(secondFetch).toHaveBeenCalledTimes(1);
    expect(requestedUrl(secondFetch).searchParams.get("latitude")).toBe("51.51");
  });

  it("makes no request when there are no places", async () => {
    const fetchMock = mockFetch([]);

    expect(await getFavouritesWeather([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gives null for a place Open-Meteo returned nothing for", async () => {
    mockFetch([placeBody(30), {}]);

    const results = await getFavouritesWeather([LAGOS, ABUJA]);

    expect(results[0]?.temperature).toBe(30);
    expect(results[1]).toBeNull();
  });

  it("throws when the request fails, so the list can say weather is unavailable", async () => {
    mockFetch({}, { ok: false, status: 500 });

    await expect(getFavouritesWeather([LAGOS])).rejects.toThrow("status 500");
  });
});
