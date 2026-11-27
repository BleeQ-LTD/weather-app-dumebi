import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

// Kept on this device for everyone (people often want different themes on
// different devices). index.html reads the same key before the page draws,
// so there is no flash of the wrong theme.
export const THEME_KEY = "weather-app-theme";

const SYSTEM_LIGHT = "(prefers-color-scheme: light)";

export function getStoredTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch (error) {
    console.error("Unable to save the theme:", error);
  }
}

export function resolveTheme(choice: ThemeChoice, systemPrefersLight: boolean): "light" | "dark" {
  if (choice === "system") return systemPrefersLight ? "light" : "dark";
  return choice;
}

function applyTheme(choice: ThemeChoice) {
  const prefersLight = window.matchMedia?.(SYSTEM_LIGHT).matches ?? false;
  document.documentElement.dataset.theme = resolveTheme(choice, prefersLight);
}

// The current choice, and a setter that saves and applies it. "System" keeps
// following the device if its setting changes while the app is open.
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system" || !window.matchMedia) return;

    const query = window.matchMedia(SYSTEM_LIGHT);
    const follow = () => applyTheme("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [theme]);

  const changeTheme = useCallback((next: ThemeChoice) => {
    storeTheme(next);
    setTheme(next);
  }, []);

  return { theme, changeTheme };
}
