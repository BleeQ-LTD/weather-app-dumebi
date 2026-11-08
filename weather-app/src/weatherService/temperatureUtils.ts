
import type { TemperatureUnit } from "../firebaseService/profileService";

export function convertTemperature(
  celsius: number,
  unit: TemperatureUnit,
): number {
  if (unit === "fahrenheit") {
    return (celsius * 9) / 5 + 32;
  }

  return celsius;
}

export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit,
): string {
  return `${Math.round(convertTemperature(celsius, unit))}°${unit === "fahrenheit" ? "F" : "C"}`;
}
