import { useEffect, useState } from "react";
import { FALLBACK_LOCATION, getCurrentLocation } from "../locationService/geolocationService";
import type { Location } from "../locationService/locationTypes";

interface CurrentLocationState {
  status: "detecting" | "ready";
  myLocation: Location | null;
  notice: string; 
}

export function useCurrentLocation(): CurrentLocationState {
  const [state, setState] = useState<CurrentLocationState>({
    status: "detecting",
    myLocation: null,
    notice: "",
  });

  useEffect(() => {
    let cancelled = false;

    getCurrentLocation()
      .then((location) => {
        if (!cancelled) setState({ status: "ready", myLocation: location, notice: "" });
      })
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : "Could not get your location.";
        if (!cancelled) {
          setState({
            status: "ready",
            myLocation: null,
            notice: `${reason} Showing ${FALLBACK_LOCATION.name} instead.`,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
