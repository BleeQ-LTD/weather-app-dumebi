
import { useEffect, useState } from "react";
import { locateUser } from "../locationService/geolocationService";
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

    locateUser((location) => {
      if (!cancelled) {
        setState({
          status: "ready",
          myLocation: location,
          notice: "",
        });
      }
    }).catch((err: unknown) => {
      if (cancelled) return;

      const reason =
        err instanceof Error
          ? err.message
          : "Could not get your location.";

      setState({
        status: "ready",
        myLocation: null,
        notice: `${reason} Search for a city to see its weather.`,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
