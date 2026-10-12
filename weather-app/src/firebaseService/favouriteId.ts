type Coords = { latitude: number; longitude: number };

// Stable document ID: coordinates rounded to 2 decimals (about 1 km grid).
export function makeFavouriteId(place: Coords): string {
  return `${place.latitude.toFixed(2)}_${place.longitude.toFixed(2)}`;
}

// "Same place" means within about 5 km. The same city can land in different
// 1 km grid squares (live location vs searched result), so IDs alone miss it.
export function isSamePlace(a: Coords, b: Coords): boolean {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(h));
  return km < 5;
}
