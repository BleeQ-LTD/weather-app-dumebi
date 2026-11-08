
import type { Location } from "./locationTypes";

const LAST_LOCATION_KEY = "weather-app-last-location";

export function saveLastLocation(location: Location): void {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  } catch (error) {
    console.error("Unable to save last location:", error);
  }
}

export function getLastLocation(): Location | null {
  try {
    const saved = localStorage.getItem(LAST_LOCATION_KEY);

    if (!saved) return null;

    const location: unknown = JSON.parse(saved);

    if (
      typeof location !== "object" ||
      location === null ||
      !("name" in location) ||
      !("latitude" in location) ||
      !("longitude" in location) ||
      typeof location.name !== "string" ||
      typeof location.latitude !== "number" ||
      !Number.isFinite(location.latitude) ||
      typeof location.longitude !== "number" ||
      !Number.isFinite(location.longitude)
    ) {
      return null;
    }

    return location as Location;
  } catch (error) {
    console.error("Unable to retrieve last location:", error);
    return null;
  }
}
