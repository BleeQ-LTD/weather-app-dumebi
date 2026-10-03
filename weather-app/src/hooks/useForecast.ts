import { useEffect, useState } from "react";
import { getForecast } from "../weatherService/weatherService";
import type { Forecast } from "../weatherService/weatherTypes";
import type { Location } from "../locationService/locationTypes";

export function useForecast(location: Location | null) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!location) return;

    let cancelled = false; 

    setLoading(true);
    setError("");

    getForecast(location.latitude, location.longitude)
      .then((result) => {
        if (!cancelled) setForecast(result);
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
  }, [location]);

  return { forecast, loading, error };
}
