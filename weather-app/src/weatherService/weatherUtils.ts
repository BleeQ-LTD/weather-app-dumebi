// Small pure helpers for turning weather data into text and icons

export function getWeatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code === 1) return isDay ? "🌤️" : "🌙";
  if (code === 2) return isDay ? "⛅" : "☁️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️";
  if (code === 95 || code === 96 || code === 99) return "⛈️";
  return "☁️";
}

// Matches the rounded number shown on the tile
export function getUvLabel(uv: number): string {
  const value = Math.round(uv);
  if (value < 3) return "Low";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  if (value < 11) return "Very high";
  return "Extreme";
}

// Degrees (0-360) -> N, NE, E, SE, S, SW, W, NW
export function getCompassDirection(degrees: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalised = ((degrees % 360) + 360) % 360;
  return points[Math.round(normalised / 45) % 8];
}

// "2026-10-01T14:00" -> "14"; the hour we're in right now is "Now"
export function getHourLabel(time: string, isNow: boolean): string {
  return isNow ? "Now" : time.slice(11, 13);
}

// True for the hourly entry that contains the current time
// ("2026-10-01T14:00" contains "2026-10-01T14:15")
export function isCurrentHour(hourTime: string, currentTime: string): boolean {
  return hourTime.slice(0, 13) === currentTime.slice(0, 13);
}

// "2026-10-01T18:38" -> "18:38"
export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

// "2026-10-03" -> "Sat" (the first item is "Today")
export function getDayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  // T00:00:00 makes the browser read it as a local date, so the weekday doesn't shift
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

// Position of a day's low-high range inside the whole 10-day range (as percentages)
export function getRangeBar(
  min: number,
  max: number,
  weekMin: number,
  weekMax: number
): { left: number; width: number } {
  const MIN_WIDTH = 4; // keeps a one-degree day visible

  const span = weekMax - weekMin;
  if (span <= 0) return { left: 0, width: 100 };

  const width = Math.max(((max - min) / span) * 100, MIN_WIDTH);
  const left = Math.min(((min - weekMin) / span) * 100, 100 - width);

  return { left, width };
}

export function getFeelsLikeDescription(feelsLike: number, actual: number): string {
  const difference = feelsLike - actual;
  if (Math.abs(difference) < 2) return "Similar to the actual temperature.";
  return difference > 0
    ? "Feels warmer than the actual temperature."
    : "Feels cooler than the actual temperature.";
}

export function getVisibilityDescription(km: number): string {
  if (km >= 10) return "Perfectly clear view.";
  if (km >= 5) return "Good visibility.";
  if (km >= 1) return "Reduced visibility.";
  return "Poor visibility.";
}
