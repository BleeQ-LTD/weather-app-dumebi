import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FORECAST_DAYS,
  getForecast,
  getWeatherDescription,
} from "../../weatherService/weatherService";
import type { OpenMeteoForecastResponse } from "../../weatherService/weatherTypes";

// Replaces fetch with a fake that returns the given body
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

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = 240; // 10 days of hourly data, starting at midnight on 1 Oct
const CURRENT_INDEX = 14; // the current time below is 14:15, so hour index 14

// Whole numbers everywhere so assertions are exact
function makeBody(): OpenMeteoForecastResponse {
  return {
    utc_offset_seconds: 3600, // Lagos is UTC+1
    current: {
      time: "2026-10-01T14:15",
      temperature_2m: 29.4,
      relative_humidity_2m: 74,
      apparent_temperature: 32.1,
      is_day: 1,
      weather_code: 3,
      wind_speed_10m: 20.5,
      wind_direction_10m: 225,
      wind_gusts_10m: 32,
      pressure_msl: 1013.2,
    },
    hourly: {
      time: Array.from({ length: HOURS }, (_, i) => {
        return `2026-10-${pad(Math.floor(i / 24) + 1)}T${pad(i % 24)}:00`;
      }),
      temperature_2m: Array.from({ length: HOURS }, (_, i) => 20 + i),
      weather_code: Array.from({ length: HOURS }, (_, i) => (i % 2 === 0 ? 3 : 61)),
      is_day: Array.from({ length: HOURS }, (_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
      precipitation_probability: Array.from({ length: HOURS }, (_, i) => i % 100),
      precipitation: Array.from({ length: HOURS }, () => 0.5),
      uv_index: Array.from({ length: HOURS }, (_, i) => i % 12),
      visibility: Array.from({ length: HOURS }, (_, i) => 20000 + i * 100),
      dew_point_2m: Array.from({ length: HOURS }, (_, i) => 22 + (i % 5)),
    },
    daily: {
      time: Array.from({ length: 10 }, (_, i) => `2026-10-${pad(i + 1)}`),
      weather_code: Array.from({ length: 10 }, () => 2),
      temperature_2m_max: Array.from({ length: 10 }, (_, i) => 31 + i),
      temperature_2m_min: Array.from({ length: 10 }, (_, i) => 24 + i),
      precipitation_probability_max: Array.from({ length: 10 }, (_, i) => 40 + i),
      sunrise: Array.from({ length: 10 }, (_, i) => `2026-10-${pad(i + 1)}T06:33`),
      sunset: Array.from({ length: 10 }, (_, i) => `2026-10-${pad(i + 1)}T18:38`),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TC-OM-001 forecast API: the request", () => {
  it("makes one request to the forecast endpoint with the given coordinates", async () => {
    const fetchMock = mockFetch(makeBody());

    await getForecast(6.5244, 3.3792);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("6.5244");
    expect(url.searchParams.get("longitude")).toBe("3.3792");
  });

  it("asks for the current, hourly and daily variables the screen needs", async () => {
    const fetchMock = mockFetch(makeBody());

    await getForecast(6.5244, 3.3792);

    const url = requestedUrl(fetchMock);
    const list = (name: string) => (url.searchParams.get(name) ?? "").split(",");

    expect(list("current")).toEqual(
      expect.arrayContaining([
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "pressure_msl",
        "weather_code",
        "is_day",
      ])
    );
    expect(list("hourly")).toEqual(
      expect.arrayContaining([
        "temperature_2m",
        "weather_code",
        "is_day",
        "precipitation_probability",
        "precipitation",
        "uv_index",
        "visibility",
        "dew_point_2m",
      ])
    );
    expect(list("daily")).toEqual(
      expect.arrayContaining([
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "sunrise",
        "sunset",
      ])
    );
  });

  it("requests 8 days of forecast", async () => {
    const fetchMock = mockFetch(makeBody());

    await getForecast(6.5244, 3.3792);

    expect(requestedUrl(fetchMock).searchParams.get("forecast_days")).toBe("8");
    expect(FORECAST_DAYS).toBe(8);
  });

  it("asks for times in the location's own timezone", async () => {
    const fetchMock = mockFetch(makeBody());

    await getForecast(6.5244, 3.3792);

    expect(requestedUrl(fetchMock).searchParams.get("timezone")).toBe("auto");
  });
});

describe("TC-OM-001 forecast API: current weather", () => {
  it("maps the current conditions, including feels-like and wind", async () => {
    mockFetch(makeBody());

    const { current } = await getForecast(6.5244, 3.3792);

    expect(current).toEqual({
      time: "2026-10-01T14:15",
      temperature: 29.4,
      feelsLike: 32.1,
      humidity: 74,
      windSpeed: 20.5,
      windGusts: 32,
      windDirection: 225,
      pressure: 1013.2,
      weatherCode: 3,
      weatherDescription: "Overcast",
      isDay: true,
    });
  });

  it("reads is_day 0 as night", async () => {
    const body = makeBody();
    body.current.is_day = 0;
    mockFetch(body);

    const { current } = await getForecast(6.5244, 3.3792);

    expect(current.isDay).toBe(false);
  });
});

describe("TC-OM-001 and TC-OM-006 forecast API: today's 24 hours", () => {
  it("returns 24 hours, from 00:00 to 23:00 today", async () => {
    mockFetch(makeBody());

    const { hourly } = await getForecast(6.5244, 3.3792);

    expect(hourly).toHaveLength(24);
    expect(hourly[0].time).toBe("2026-10-01T00:00");
    expect(hourly[23].time).toBe("2026-10-01T23:00");
  });

  it("starts at midnight even though it is already 14:15", async () => {
    mockFetch(makeBody());

    const { hourly } = await getForecast(6.5244, 3.3792);

    expect(hourly.map((h) => h.time)).toContain("2026-10-01T14:00");
    expect(hourly[0].time).not.toBe("2026-10-01T14:00");
  });

  it("only includes hours from today, never tomorrow", async () => {
    mockFetch(makeBody());

    const { hourly } = await getForecast(6.5244, 3.3792);

    hourly.forEach((hour) => expect(hour.time.startsWith("2026-10-01")).toBe(true));
  });

  it("follows the current day: 09:15 on 2 Oct shows 2 Oct 00:00 to 23:00", async () => {
    const body = makeBody();
    body.current.time = "2026-10-02T09:15";
    mockFetch(body);

    const { hourly } = await getForecast(6.5244, 3.3792);

    expect(hourly).toHaveLength(24);
    expect(hourly[0].time).toBe("2026-10-02T00:00");
    expect(hourly[23].time).toBe("2026-10-02T23:00");
  });

  it("keeps every timestamp aligned with its own measurements", async () => {
    const body = makeBody();
    mockFetch(body);

    const { hourly } = await getForecast(6.5244, 3.3792);

    hourly.forEach((hour, offset) => {
      const i = offset;
      expect(hour.time).toBe(body.hourly.time[i]);
      expect(hour.temperature).toBe(body.hourly.temperature_2m[i]);
      expect(hour.weatherCode).toBe(body.hourly.weather_code[i]);
      expect(hour.precipitationProbability).toBe(body.hourly.precipitation_probability[i]);
      expect(hour.isDay).toBe(body.hourly.is_day[i] === 1);
    });
  });

  it("adds a description for each weather code", async () => {
    mockFetch(makeBody());

    const { hourly } = await getForecast(6.5244, 3.3792);

    expect(hourly[0].weatherDescription).toBe("Overcast"); // index 0 -> code 3
    expect(hourly[1].weatherDescription).toBe("Slight rain"); // index 1 -> code 61
  });

  it("starts from the first entry if the current hour is not in the list", async () => {
    const body = makeBody();
    body.current.time = "2030-01-01T09:00";
    mockFetch(body);

    const { hourly } = await getForecast(6.5244, 3.3792);

    expect(hourly[0].time).toBe("2026-10-01T00:00");
  });
});

describe("TC-OM-001 forecast API: 10-day forecast", () => {
  it("returns 10 days with the right low, high, sunrise and sunset", async () => {
    mockFetch(makeBody());

    const { daily } = await getForecast(6.5244, 3.3792);

    expect(daily).toHaveLength(10);
    expect(daily[0]).toEqual({
      date: "2026-10-01",
      minTemp: 24,
      maxTemp: 31,
      weatherCode: 2,
      weatherDescription: "Partly cloudy",
      precipitationProbability: 40,
      sunrise: "2026-10-01T06:33",
      sunset: "2026-10-01T18:38",
    });
    expect(daily[9].minTemp).toBe(33);
    expect(daily[9].maxTemp).toBe(40);
    daily.forEach((day) => expect(day.minTemp).toBeLessThanOrEqual(day.maxTemp));
  });
});

describe("TC-OM-006 forecast data integrity: detail tiles", () => {
  it("takes UV, visibility and dew point from the current hour", async () => {
    mockFetch(makeBody());

    const { details } = await getForecast(6.5244, 3.3792);

    expect(details.uvIndex).toBe(CURRENT_INDEX % 12); // 2
    expect(details.visibilityKm).toBe(21); // 21,400 m rounds to 21 km
    expect(details.dewPoint).toBe(22 + (CURRENT_INDEX % 5)); // 26
  });

  it("adds up the expected precipitation over the next 24 hours", async () => {
    mockFetch(makeBody());

    const { details } = await getForecast(6.5244, 3.3792);

    expect(details.precipitationNext24h).toBe(12); // 24 hours x 0.5 mm
  });

  it("handles missing (null) values safely", async () => {
    const body = makeBody();
    body.hourly.uv_index = body.hourly.uv_index.map(() => null);
    body.hourly.visibility = body.hourly.visibility.map(() => null);
    body.hourly.dew_point_2m = body.hourly.dew_point_2m.map(() => null);
    body.hourly.precipitation = body.hourly.precipitation.map(() => null);
    body.hourly.precipitation_probability = body.hourly.precipitation_probability.map(() => null);
    body.daily.precipitation_probability_max = body.daily.precipitation_probability_max.map(() => null);
    mockFetch(body);

    const { details, hourly, daily } = await getForecast(6.5244, 3.3792);

    expect(details).toEqual({
      uvIndex: null,
      visibilityKm: null,
      dewPoint: null,
      precipitationNext24h: 0,
    });
    expect(hourly[0].precipitationProbability).toBeNull();
    expect(daily[0].precipitationProbability).toBeNull();
  });
});

describe("forecast API: the location's UTC offset", () => {
  it("keeps the offset, which tells the app when the location's hour or day changes", async () => {
    mockFetch(makeBody());

    const forecast = await getForecast(6.5244, 3.3792);

    expect(forecast.utcOffsetSeconds).toBe(3600);
  });

  it("falls back to an offset of 0 if the API leaves it out", async () => {
    const body: Partial<OpenMeteoForecastResponse> = makeBody();
    delete body.utc_offset_seconds;
    mockFetch(body);

    const forecast = await getForecast(6.5244, 3.3792);

    expect(forecast.utcOffsetSeconds).toBe(0);
  });
});

describe("TC-OM-005 invalid coordinates", () => {
  it("throws with the status when the API rejects the coordinates", async () => {
    mockFetch(
      { error: true, reason: "Latitude must be in range of -90 to 90°" },
      { ok: false, status: 400 }
    );

    await expect(getForecast(999, 3.3792)).rejects.toThrow("status 400");
  });

  it("sends negative coordinates correctly", async () => {
    const fetchMock = mockFetch(makeBody());

    await getForecast(-33.8688, 151.2093);

    const url = requestedUrl(fetchMock);
    expect(url.searchParams.get("latitude")).toBe("-33.8688");
    expect(url.searchParams.get("longitude")).toBe("151.2093");
  });
});

describe("TC-OM-007 API failure", () => {
  it("throws on an HTTP 500", async () => {
    mockFetch({}, { ok: false, status: 500 });

    await expect(getForecast(6.5244, 3.3792)).rejects.toThrow("status 500");
  });

  it("rejects when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(getForecast(6.5244, 3.3792)).rejects.toThrow("Failed to fetch");
  });

  it("passes a timeout error from the network layer straight through to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation timed out", "TimeoutError"))
    );

    await expect(getForecast(6.5244, 3.3792)).rejects.toThrow("timed out");
  });

  it("rejects instead of returning garbage when the response has an unexpected shape", async () => {
    mockFetch({ unexpected: "shape" });

    await expect(getForecast(6.5244, 3.3792)).rejects.toThrow();
  });
});

describe("getWeatherDescription", () => {
  it.each([
    [0, "Clear sky"],
    [1, "Mainly clear"],
    [2, "Partly cloudy"],
    [3, "Overcast"],
    [45, "Fog"],
    [63, "Moderate rain"],
    [95, "Thunderstorm (slight or moderate)"],
    [99, "Thunderstorm with heavy hail"],
  ])("maps code %i to '%s'", (code, description) => {
    expect(getWeatherDescription(code)).toBe(description);
  });

  it("falls back for codes it does not know", () => {
    expect(getWeatherDescription(1234)).toBe("Unknown weather");
  });
});
