import { afterEach, describe, expect, it, vi } from "vitest";
import { getStoredTheme, resolveTheme, storeTheme, THEME_KEY } from "../../utils/themePreference";

function fakeStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("theme preference", () => {
  it("defaults to System", () => {
    fakeStorage();
    expect(getStoredTheme()).toBe("system");
  });

  it("remembers Light and Dark, and forgets the key for System", () => {
    const data = fakeStorage();
    storeTheme("light");
    expect(getStoredTheme()).toBe("light");
    storeTheme("dark");
    expect(data.get(THEME_KEY)).toBe("dark");
    storeTheme("system");
    expect(data.has(THEME_KEY)).toBe(false);
    expect(getStoredTheme()).toBe("system");
  });

  it("ignores unknown stored values", () => {
    const data = fakeStorage();
    data.set(THEME_KEY, "purple");
    expect(getStoredTheme()).toBe("system");
  });

  it("resolves System from the device setting", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });
});
