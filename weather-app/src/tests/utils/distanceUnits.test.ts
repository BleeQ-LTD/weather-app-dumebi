import { describe, expect, it } from "vitest";
import { formatDistance, formatRainAmount, formatSpeed } from "../../weatherService/distanceUtils";

describe("distance units", () => {
  it("shows wind in km/h or mph", () => {
    expect(formatSpeed(12, "metric")).toEqual({ value: "12", unit: "km/h" });
    expect(formatSpeed(16.09, "imperial")).toEqual({ value: "10", unit: "mph" });
  });

  it("shows visibility in km or miles", () => {
    expect(formatDistance(10, "metric")).toBe("10 km");
    expect(formatDistance(10, "imperial")).toBe("6.2 mi");
    expect(formatDistance(24.1, "imperial")).toBe("15 mi");
  });

  it("shows rain amounts in mm or inches", () => {
    expect(formatRainAmount(2.4, "metric")).toBe("2.4 mm");
    expect(formatRainAmount(25.4, "imperial")).toBe("1 in");
    expect(formatRainAmount(0, "imperial")).toBe("0 in");
    expect(formatRainAmount(0.1, "imperial")).toBe("0.01 in"); // a trace never reads as 0
  });
});
