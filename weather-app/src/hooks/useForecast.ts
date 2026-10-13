import { useEffect, useState } from "react";
import { getForecast } from "../weatherService/weatherService";
import {
  isForecastStale,
  MIN_REFRESH_GAP_MS,
  STALE_CHECK_INTERVAL_MS,
} from "../weatherService/forecastFreshness";
import type { Forecast } from "../weatherService/weatherTypes";
import type { Location } from "../locationService/locationTypes";

interface LoadedForecast {
  forecast: Forecast;
  latitude: number;
  longitude: number;
  fetchedAt: number;
}

export function useForecast(location: Location | null) {
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const [loaded, setLoaded] = useState<LoadedForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    let cancelled = false;

    setLoading(true);
    setError("");
    setRefreshFailed(false);

    getForecast(latitude, longitude)
      .then((forecast) => {
        if (!cancelled) setLoaded({ forecast, latitude, longitude, fetchedAt: Date.now() });
      })
      .catch((err) => {
        console.error("Weather fetch failed:", err);
        if (!cancelled) setError("Weather data is currently unavailable. Please try again later.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  // Keep what is on screen current: refresh quietly when the data goes stale
  // (15 minutes old, or the location's hour or day has changed). This is what stops
  // an app left open overnight from still saying "Today" and "Now" about yesterday.
  useEffect(() => {
    if (!loaded) return;

    const current = loaded;
    let cancelled = false;
    let refreshing = false;
    let lastAttempt = 0;

    function refreshIfStale() {
      // A hidden tab doesn't need updating; the visibilitychange event refreshes it on return
      if (refreshing || document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - lastAttempt < MIN_REFRESH_GAP_MS) return;
      if (!isForecastStale(current.forecast, current.fetchedAt, now)) return;

      refreshing = true;
      lastAttempt = now;

      getForecast(current.latitude, current.longitude)
        .then((forecast) => {
          if (cancelled) return;
          setLoaded({
            forecast,
            latitude: current.latitude,
            longitude: current.longitude,
            fetchedAt: Date.now(),
          });
          setRefreshFailed(false);
        })
        .catch((err) => {
          console.error("Background refresh failed:", err);
          if (!cancelled) setRefreshFailed(true);
        })
        .finally(() => {
          refreshing = false;
        });
    }

    const interval = setInterval(refreshIfStale, STALE_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfStale);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [loaded]);

  // Never show one place's weather under another place's name
  const forecast =
    loaded && loaded.latitude === latitude && loaded.longitude === longitude
      ? loaded.forecast
      : null;

  return { forecast, loading, error, refreshFailed };
}
