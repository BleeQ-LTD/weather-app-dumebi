import { useEffect, useState } from "react";
console.log(__APP_VERSION__);

const CHECK_EVERY_MS = 5 * 60 * 1000;

export async function fetchLatestVersion(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: { version?: unknown } = await response.json();
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

export function useAppUpdate(
    currentVersion: string = __APP_VERSION__
): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const latest = await fetchLatestVersion();
      if (!cancelled && latest !== null && latest !== currentVersion) setUpdateAvailable(true);
    }

    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentVersion]);

  return updateAvailable;
}