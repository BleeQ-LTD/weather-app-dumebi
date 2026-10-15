import type { Location } from "./locationTypes";
import { makePlace } from "./placeLabel";

// No hard-coded fallback city: if precise location fails, the app uses an
// approximate location from the network (getApproximateLocation below).

export const DEFAULT_PLACE_NAME = "My Location";

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const PLACE_NAME_TIMEOUT_MS = 4000;

interface ReverseGeocodeResponse {
  latitude?: number;
  longitude?: number;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
}

type Place = Pick<Location, "name" | "countryCode">;

// "City, Country", built exactly like the search results
function placeFrom(data: ReverseGeocodeResponse): Place | null {
  const city = data.city || data.locality || data.principalSubdivision;
  return city ? makePlace(city, data.countryCode, data.countryName) : null;
}

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

async function fetchPlace(
  latitude: number,
  longitude: number,
  signal: AbortSignal
): Promise<Place | null> {
  try {
    const url =
      `${REVERSE_GEOCODE_URL}?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&localityLanguage=en`;

    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const data: ReverseGeocodeResponse = await response.json();
    return placeFrom(data);
  } catch {
    return null;
  }
}

export async function getPlace(
  latitude: number,
  longitude: number,
  timeoutMs: number = PLACE_NAME_TIMEOUT_MS
): Promise<Place | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchPlace(latitude, longitude, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getPlaceName(
  latitude: number,
  longitude: number,
  timeoutMs: number = PLACE_NAME_TIMEOUT_MS
): Promise<string | null> {
  return (await getPlace(latitude, longitude, timeoutMs))?.name ?? null;
}

// Approximate position from the network (IP). Used only when the browser's
// precise location is denied, times out or is unsupported.
export async function getApproximateLocation(): Promise<Location | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PLACE_NAME_TIMEOUT_MS);

    // With no coordinates, this endpoint locates the caller by IP address
    const response = await fetch(`${REVERSE_GEOCODE_URL}?localityLanguage=en`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;

    const data: ReverseGeocodeResponse = await response.json();
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }

    return {
      ...(placeFrom(data) ?? { name: DEFAULT_PLACE_NAME }),
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return null;
  }
}

export async function locateUser(onLocation: (location: Location) => void): Promise<void> {
  const { latitude, longitude } = await getCurrentCoordinates();

  onLocation({ name: DEFAULT_PLACE_NAME, latitude, longitude });

  const place = await getPlace(latitude, longitude);
  if (place) onLocation({ ...place, latitude, longitude });
}
