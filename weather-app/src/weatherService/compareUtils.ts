import type { TemperatureUnit } from "../firebaseService/profileService";
import { convertTemperature } from "./temperatureUtils";

// "Lagos, Nigeria" -> "Lagos"
export function shortPlaceName(name: string): string {
  return name.split(",")[0]?.trim() || name;
}

// One plain sentence for the comparison, using the rounded numbers shown on
// screen so the sentence and the cards always agree.
export function describeTemperatureDifference(
  nameA: string,
  celsiusA: number,
  nameB: string,
  celsiusB: number,
  unit: TemperatureUnit
): string {
  const a = Math.round(convertTemperature(celsiusA, unit));
  const b = Math.round(convertTemperature(celsiusB, unit));
  const cityA = shortPlaceName(nameA);
  const cityB = shortPlaceName(nameB);

  if (a === b) return `${cityA} and ${cityB} are the same temperature right now.`;

  const difference = Math.abs(a - b);
  const [warmer, cooler] = a > b ? [cityA, cityB] : [cityB, cityA];
  return `${warmer} is ${difference}° warmer than ${cooler} right now.`;
}
