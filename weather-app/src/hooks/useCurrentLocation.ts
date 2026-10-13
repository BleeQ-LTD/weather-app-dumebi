import { useEffect, useState } from "react";
import { getApproximateLocation, locateUser } from "../locationService/geolocationService";
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
      if (!cancelled) setState({ status: "ready", myLocation: location, notice: "" });
    }).catch(async (err: unknown) => {
      const reason = err instanceof Error ? err.message : "Could not get your location.";
      const approximate = await getApproximateLocation();
      if (cancelled) return;

      setState({
        status: "ready",
        myLocation: approximate,
        notice: approximate
          ? `${reason} Showing your approximate location instead.`
          : `${reason} Search for a city to see its weather.`,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
