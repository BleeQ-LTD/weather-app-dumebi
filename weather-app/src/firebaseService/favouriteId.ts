import type { Location } from "../locationService/locationTypes";

type PlaceLike = {
  name: string; // "City, Country" (older saves may be "City, Region, Country" or just "City")
  countryCode?: string;
  latitude?: number;
  longitude?: number;
};

const slug = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function segments(place: PlaceLike): string[] {
  return place.name
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function cityOf(place: PlaceLike): string {
  return slug(segments(place)[0] ?? "");
}

function countryOf(place: PlaceLike): { code: string; name: string } {
  const parts = segments(place);
  return {
    code: (place.countryCode ?? "").toLowerCase(),
    name: parts.length > 1 ? slug(parts[parts.length - 1]) : "",
  };
}

// The Firestore document id: city + country, so one city is one document.
// Saving the same city again writes to the same document and can't duplicate.
export function makeFavouriteId(place: PlaceLike): string {
  const country = countryOf(place);
  return [cityOf(place) || "place", country.code || country.name].filter(Boolean).join("_");
}

function sameCountry(a: PlaceLike, b: PlaceLike): boolean {
  const x = countryOf(a);
  const y = countryOf(b);
  if (x.code && y.code) return x.code === y.code;
  if (x.name && y.name) return x.name === y.name;
  return true; // one side doesn't say (older saves): match on the city alone
}

function hasCoords(place: PlaceLike): place is PlaceLike & { latitude: number; longitude: number } {
  return typeof place.latitude === "number" && typeof place.longitude === "number";
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Same place = same city in the same country, or practically the same spot
// (under 1 km), which covers "My Location" before its name has been looked up.
export function isSamePlace(a: PlaceLike, b: PlaceLike): boolean {
  if (hasCoords(a) && hasCoords(b) && distanceKm(a, b) < 1) return true;

  const city = cityOf(a);
  return city !== "" && city === cityOf(b) && sameCountry(a, b);
}

export type { Location };
