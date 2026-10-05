import { describe, expect, it } from "vitest";
import {
  getLocalHour,
  isForecastStale,
  MAX_FORECAST_AGE_MS,
  MIN_REFRESH_GAP_MS,
} from "../../weatherService/forecastFreshness";

const MINUTE = 60 * 1000;

// Moments written with an explicit UTC offset, so the tests don't depend on the machine's timezone
const lagos = (local: string) => Date.parse(`${local}+01:00`);
const india = (local: string) => Date.parse(`${local}+05:30`);

const lagosForecast = { utcOffsetSeconds: 3600 };
const indiaForecast = { utcOffsetSeconds: 19800 };

describe("getLocalHour", () => {
  it("gives the location's own hour, not UTC", () => {
    expect(getLocalHour(Date.parse("2026-10-01T22:58:00Z"), 3600)).toBe("2026-10-01T23");
  });

  it("rolls over to the next day at the location's midnight", () => {
    expect(getLocalHour(Date.parse("2026-10-01T23:05:00Z"), 3600)).toBe("2026-10-02T00");
  });

  it("handles half-hour offsets such as India", () => {
    expect(getLocalHour(Date.parse("2026-10-01T18:40:00Z"), 19800)).toBe("2026-10-02T00");
  });

  it("treats a missing or invalid offset as UTC instead of throwing", () => {
    expect(getLocalHour(Date.parse("2026-10-01T10:30:00Z"), NaN)).toBe("2026-10-01T10");
  });
});

describe("isForecastStale: labels such as 'Today' and 'Now' must not go out of date", () => {
  it("is fresh in the same hour, 10 minutes after loading", () => {
    const fetchedAt = lagos("2026-10-01T14:05:00");

    expect(isForecastStale(lagosForecast, fetchedAt, fetchedAt + 10 * MINUTE)).toBe(false);
  });

  it("goes stale once the data is 15 minutes old", () => {
    const fetchedAt = lagos("2026-10-01T14:05:00");

    expect(MAX_FORECAST_AGE_MS).toBe(15 * MINUTE);
    expect(isForecastStale(lagosForecast, fetchedAt, fetchedAt + 14 * MINUTE)).toBe(false);
    expect(isForecastStale(lagosForecast, fetchedAt, fetchedAt + 15 * MINUTE)).toBe(true);
  });

  it("goes stale when the hour changes, so 'Now' moves on (even if the data is only minutes old)", () => {
    const fetchedAt = lagos("2026-10-01T14:55:00");
    const now = lagos("2026-10-01T15:01:00"); // 6 minutes later, but a new hour

    expect(isForecastStale(lagosForecast, fetchedAt, now)).toBe(true);
  });

  it("goes stale at midnight, so yesterday is no longer labelled 'Today'", () => {
    const fetchedAt = lagos("2026-10-01T23:58:00");
    const now = lagos("2026-10-02T00:03:00");

    expect(isForecastStale(lagosForecast, fetchedAt, now)).toBe(true);
  });

  it("is stale after being left open overnight", () => {
    const fetchedAt = lagos("2026-10-01T22:00:00");
    const now = lagos("2026-10-02T07:30:00");

    expect(isForecastStale(lagosForecast, fetchedAt, now)).toBe(true);
  });

  it("uses the location's clock: a half-hour offset changes hour at :30 UTC", () => {
    // 23:57 to 00:03 in India. The UTC hour (18) is the same for both, so a UTC-based
    // check would wrongly call this fresh.
    const fetchedAt = india("2026-10-01T23:57:00");
    const now = india("2026-10-02T00:03:00");

    expect(isForecastStale(indiaForecast, fetchedAt, now)).toBe(true);
  });

  it("does not refresh again within 2 minutes of loading, even across an hour boundary", () => {
    const fetchedAt = lagos("2026-10-01T14:59:30");
    const now = lagos("2026-10-01T15:01:00"); // 90 seconds later

    expect(MIN_REFRESH_GAP_MS).toBe(2 * MINUTE);
    expect(isForecastStale(lagosForecast, fetchedAt, now)).toBe(false);
  });

  it("allows the refresh once that 2 minutes has passed", () => {
    const fetchedAt = lagos("2026-10-01T14:59:30");
    const now = lagos("2026-10-01T15:01:30");

    expect(isForecastStale(lagosForecast, fetchedAt, now)).toBe(true);
  });

  it("does not get stuck refreshing if the device clock is wrong", () => {
    // Both timestamps come from the same clock, so a clock that is hours off changes nothing:
    // data loaded 5 minutes ago is still fresh.
    const wrongClock = lagos("2031-01-01T03:10:00");

    expect(isForecastStale(lagosForecast, wrongClock, wrongClock + 5 * MINUTE)).toBe(false);
  });
});
