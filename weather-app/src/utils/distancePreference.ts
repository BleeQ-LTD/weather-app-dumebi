import { useCallback, useState } from "react";
import type { DistanceUnit } from "../weatherService/distanceUtils";

// Kept on this device for everyone, like the theme.
const DISTANCE_KEY = "weather-app-distance-unit";

export function getStoredDistanceUnit(): DistanceUnit {
  try {
    return localStorage.getItem(DISTANCE_KEY) === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function storeDistanceUnit(unit: DistanceUnit): void {
  try {
    localStorage.setItem(DISTANCE_KEY, unit);
  } catch (error) {
    console.error("Unable to save the distance unit:", error);
  }
}

export function useDistanceUnit() {
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(getStoredDistanceUnit);

  const changeDistanceUnit = useCallback((next: DistanceUnit) => {
    storeDistanceUnit(next);
    setDistanceUnit(next);
  }, []);

  return { distanceUnit, changeDistanceUnit };
}
