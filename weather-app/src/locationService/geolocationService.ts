import type { Location } from "./locationTypes";

export async function getApproximateLocation(): Promise<Location | null> {
  try {
    const response = await fetch(`${REVERSE_GEOCODE_URL}?localityLanguage=en`);
    if (!response.ok) return null;

    const data: {
      latitude?: number;
      longitude?: number;
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    } = await response.json();

    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }

    return {
      name: data.city || data.locality || data.principalSubdivision || DEFAULT_PLACE_NAME,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_PLACE_NAME = "My Location";

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const PLACE_NAME_TIMEOUT_MS = 4000;

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

async function fetchPlaceName(
  latitude: number,
  longitude: number,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const url =
      `${REVERSE_GEOCODE_URL}?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&localityLanguage=en`;

    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const data: { city?: string; locality?: string; principalSubdivision?: string } =
      await response.json();

    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

export async function getPlaceName(
  latitude: number,
  longitude: number,
  timeoutMs: number = PLACE_NAME_TIMEOUT_MS
): Promise<string | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchPlaceName(latitude, longitude, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function locateUser(onLocation: (location: Location) => void): Promise<void> {
  const { latitude, longitude } = await getCurrentCoordinates();

  onLocation({ name: DEFAULT_PLACE_NAME, latitude, longitude });

  const name = await getPlaceName(latitude, longitude);
  if (name) onLocation({ name, latitude, longitude });
}
