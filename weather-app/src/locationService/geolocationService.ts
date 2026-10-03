import type { Location } from "./locationTypes";

// Shown when the user's location can't be found
export const FALLBACK_LOCATION: Location = {
  name: "Lagos",
  latitude: 6.5244,
  longitude: 3.3792,
};

// Free, key-less, client-side reverse geocoding (coordinates -> place name)
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

function describeGeolocationError(code: number): string {
  switch (code) {
    case 1:
      return "Location permission was denied.";
    case 2:
      return "Your location is unavailable.";
    case 3:
      return "Finding your location timed out.";
    default:
      return "Could not get your location.";
  }
}

// Asks the browser for the device's position (the browser shows a permission prompt)
export function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(new Error(describeGeolocationError(error.code))),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

// Returns a city/area name, or null if it can't be worked out (never throws)
export async function getPlaceName(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url =
      `${REVERSE_GEOCODE_URL}?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&localityLanguage=en`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data: { city?: string; locality?: string; principalSubdivision?: string } =
      await response.json();

    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

export async function getCurrentLocation(): Promise<Location> {
  const { latitude, longitude } = await getCurrentCoordinates();
  const name = await getPlaceName(latitude, longitude);

  return { name: name ?? "My Location", latitude, longitude };
}
