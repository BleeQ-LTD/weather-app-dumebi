import type { TemperatureUnit } from "../firebaseService/profileService";

const UNIT_KEY = "weather-app-temperature-unit";

// The Guest's choice lives on the device. Signed-in users keep theirs in their profile.
export function getStoredTemperatureUnit(): TemperatureUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === "fahrenheit" ? "fahrenheit" : "celsius";
  } catch (error) {
    console.error("Unable to read the temperature unit:", error);
    return "celsius";
  }
}

export function storeTemperatureUnit(unit: TemperatureUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch (error) {
    console.error("Unable to save the temperature unit:", error);
  }
}
