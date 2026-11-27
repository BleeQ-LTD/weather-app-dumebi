// Wind, visibility and rain amounts in metric (km/h, km, mm) or imperial
// (mph, mi, in). Open-Meteo always sends metric; we convert for display.
export type DistanceUnit = "metric" | "imperial";

const KM_PER_MILE = 1.609344;
const MM_PER_INCH = 25.4;

export function formatSpeed(kmh: number, unit: DistanceUnit): { value: string; unit: string } {
  return unit === "imperial"
    ? { value: String(Math.round(kmh / KM_PER_MILE)), unit: "mph" }
    : { value: String(Math.round(kmh)), unit: "km/h" };
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === "imperial") {
    const miles = km / KM_PER_MILE;
    return `${miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles)} mi`;
  }
  return `${km} km`;
}

export function formatRainAmount(mm: number, unit: DistanceUnit): string {
  if (unit === "imperial") {
    const inches = mm / MM_PER_INCH;
    return `${inches === 0 ? 0 : Math.max(Math.round(inches * 100) / 100, 0.01)} in`;
  }
  return `${mm} mm`;
}
