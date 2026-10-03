import { describe, expect, it } from "vitest";
import {
  formatTime,
  getCompassDirection,
  getDayLabel,
  getFeelsLikeDescription,
  getHourLabel,
  getRangeBar,
  getUvLabel,
  getVisibilityDescription,
  getWeatherIcon,
  isCurrentHour,
} from "../../weatherService/weatherUtils";

describe("getWeatherIcon", () => {
  it("shows sun by day and moon by night for clear sky", () => {
    expect(getWeatherIcon(0, true)).toBe("☀️");
    expect(getWeatherIcon(0, false)).toBe("🌙");
  });

  it.each([
    [3, "☁️"],
    [45, "🌫️"],
    [53, "🌦️"],
    [63, "🌧️"],
    [81, "🌧️"],
    [73, "🌨️"],
    [86, "🌨️"],
    [95, "⛈️"],
    [99, "⛈️"],
  ])("maps code %i to %s", (code, icon) => {
    expect(getWeatherIcon(code, true)).toBe(icon);
  });

  it("falls back to a cloud for unknown codes", () => {
    expect(getWeatherIcon(1234, true)).toBe("☁️");
  });
});

describe("getUvLabel", () => {
  it.each([
    [0, "Low"],
    [2, "Low"],
    [3, "Moderate"],
    [5, "Moderate"],
    [6, "High"],
    [7, "High"],
    [8, "Very high"],
    [10, "Very high"],
    [11, "Extreme"],
  ])("labels UV %i as %s", (uv, label) => {
    expect(getUvLabel(uv)).toBe(label);
  });

  it("uses the rounded value, matching the number shown on the tile", () => {
    expect(getUvLabel(5.6)).toBe("High"); // shown as 6
  });
});

describe("getCompassDirection", () => {
  it.each([
    [0, "N"],
    [45, "NE"],
    [90, "E"],
    [135, "SE"],
    [180, "S"],
    [225, "SW"],
    [270, "W"],
    [315, "NW"],
    [350, "N"],
    [360, "N"],
    [-45, "NW"],
  ])("%i degrees is %s", (degrees, direction) => {
    expect(getCompassDirection(degrees)).toBe(direction);
  });
});

describe("time and day labels", () => {
  it("labels the current hour 'Now' and the rest by hour", () => {
    expect(getHourLabel("2026-10-01T14:00", true)).toBe("Now");
    expect(getHourLabel("2026-10-01T15:00", false)).toBe("15");
    expect(getHourLabel("2026-10-01T00:00", false)).toBe("00");
  });

  it("recognises the hour that contains the current time", () => {
    expect(isCurrentHour("2026-10-01T14:00", "2026-10-01T14:15")).toBe(true);
    expect(isCurrentHour("2026-10-01T14:00", "2026-10-01T14:59")).toBe(true);
    expect(isCurrentHour("2026-10-01T15:00", "2026-10-01T14:15")).toBe(false);
  });

  it("does not mistake the same hour on a different day for the current hour", () => {
    expect(isCurrentHour("2026-10-02T14:00", "2026-10-01T14:15")).toBe(false);
  });

  it("formats sunrise/sunset times", () => {
    expect(formatTime("2026-10-01T18:38")).toBe("18:38");
  });

  it("labels the first day 'Today' and the rest by weekday", () => {
    expect(getDayLabel("2026-10-02", 0)).toBe("Today");
    expect(getDayLabel("2026-10-02", 1)).toBe("Fri");
    expect(getDayLabel("2026-10-03", 2)).toBe("Sat");
  });
});

describe("getRangeBar", () => {
  it("fills the whole bar when the day spans the whole range", () => {
    expect(getRangeBar(24, 30, 24, 30)).toEqual({ left: 0, width: 100 });
  });

  it("positions a day inside the range", () => {
    expect(getRangeBar(26, 28, 24, 32)).toEqual({ left: 25, width: 25 });
  });

  it("keeps a one-value day visible", () => {
    expect(getRangeBar(5, 5, 0, 10)).toEqual({ left: 50, width: 4 });
  });

  it("keeps a day at the very top of the range inside the bar", () => {
    const bar = getRangeBar(10, 10, 0, 10);
    expect(bar.left + bar.width).toBeLessThanOrEqual(100);
    expect(bar.width).toBeGreaterThan(0);
  });

  it("copes when every day has the same temperature", () => {
    expect(getRangeBar(28, 28, 28, 28)).toEqual({ left: 0, width: 100 });
  });
});

describe("descriptions", () => {
  it("compares feels-like to the actual temperature", () => {
    expect(getFeelsLikeDescription(29, 29)).toBe("Similar to the actual temperature.");
    expect(getFeelsLikeDescription(30, 29)).toBe("Similar to the actual temperature.");
    expect(getFeelsLikeDescription(33, 29)).toBe("Feels warmer than the actual temperature.");
    expect(getFeelsLikeDescription(25, 29)).toBe("Feels cooler than the actual temperature.");
  });

  it.each([
    [17, "Perfectly clear view."],
    [10, "Perfectly clear view."],
    [6, "Good visibility."],
    [2, "Reduced visibility."],
    [0, "Poor visibility."],
  ])("describes %i km visibility", (km, text) => {
    expect(getVisibilityDescription(km)).toBe(text);
  });
});
