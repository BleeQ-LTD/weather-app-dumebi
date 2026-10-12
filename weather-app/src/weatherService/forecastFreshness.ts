// Decides when the forecast on screen is out of date, so "Today" and "Now" never go stale

// Open-Meteo updates current conditions every 15 minutes
export const MAX_FORECAST_AGE_MS = 15 * 60 * 1000;

// Never refresh more often than this, even if the data looks stale (protects the API quota)
export const MIN_REFRESH_GAP_MS = 2 * 60 * 1000;

// How often the screen checks whether a refresh is due
export const STALE_CHECK_INTERVAL_MS = 60 * 1000;

// The location's own clock as "YYYY-MM-DDTHH" (so it also changes at local midnight)
export function getLocalHour(timestamp: number, utcOffsetSeconds: number): string {
  const offset = Number.isFinite(utcOffsetSeconds) ? utcOffsetSeconds : 0;
  return new Date(timestamp + offset * 1000).toISOString().slice(0, 13);
}

// True when the data is 15+ minutes old, or the location has moved into a new hour
// (or day) since it was fetched. Both times come from the same clock, so a wrong device
// clock cannot make it refresh in a loop.
export function isForecastStale(
  forecast: { utcOffsetSeconds: number },
  fetchedAt: number,
  now: number
): boolean {
  const age = now - fetchedAt;

  if (age < MIN_REFRESH_GAP_MS) return false;
  if (age >= MAX_FORECAST_AGE_MS) return true;

  return (
    getLocalHour(now, forecast.utcOffsetSeconds) !==
    getLocalHour(fetchedAt, forecast.utcOffsetSeconds)
  );
}
