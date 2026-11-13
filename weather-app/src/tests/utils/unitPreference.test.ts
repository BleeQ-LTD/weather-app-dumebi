import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStoredTemperatureUnit,
  storeTemperatureUnit,
} from "../../utils/unitPreference";

// A tiny stand-in for localStorage
function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  });
  return data;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TC-UI-003 Guest temperature unit", () => {
  it("defaults to Celsius when nothing is stored", () => {
    stubStorage();

    expect(getStoredTemperatureUnit()).toBe("celsius");
  });

  it("remembers Fahrenheit", () => {
    stubStorage();

    storeTemperatureUnit("fahrenheit");

    expect(getStoredTemperatureUnit()).toBe("fahrenheit");
  });

  it("remembers a switch back to Celsius", () => {
    stubStorage();

    storeTemperatureUnit("fahrenheit");
    storeTemperatureUnit("celsius");

    expect(getStoredTemperatureUnit()).toBe("celsius");
  });

  it("treats an unrecognised stored value as Celsius", () => {
    stubStorage({ "weather-app-temperature-unit": "kelvin" });

    expect(getStoredTemperatureUnit()).toBe("celsius");
  });

  it("falls back to Celsius, without crashing, when storage is blocked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(getStoredTemperatureUnit()).toBe("celsius");
    expect(() => storeTemperatureUnit("fahrenheit")).not.toThrow();
  });
});
