import { useCallback, useEffect, useState } from "react";
import { watchVersionHistory } from "../firebaseService/remoteConfig";
import {
  decidePrompt,
  type BuildInfo,
  type Release,
  type VersionPrompt,
} from "../state/versionHistory";

// Backup checks for when the live Remote Config connection isn't available
const CHECK_EVERY_MS = 5 * 60 * 1000;
const DISMISSED_KEY = "weather-app-update-dismissed";

export const RUNNING_BUILD: BuildInfo = { version: __APP_VERSION__, build: __APP_BUILD__ };

// What is live on the server right now (null if unknown, e.g. offline or dev)
export async function fetchServedBuild(fetchImpl: typeof fetch = fetch): Promise<BuildInfo | null> {
  try {
    const response = await fetchImpl(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: { version?: unknown; build?: unknown } = await response.json();
    return typeof data.version === "string" && typeof data.build === "string"
      ? { version: data.version, build: data.build }
      : null;
  } catch {
    return null;
  }
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

// Release history (for "What's new") and whether to show the reload prompt.
export function useAppUpdate() {
  const [history, setHistory] = useState<Release[]>([]);
  const [served, setServed] = useState<BuildInfo | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);

  // A Remote Config change is the instant signal; version.json confirms the
  // new build is live before anyone is prompted.
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;

    async function check() {
      const latest = await fetchServedBuild();
      if (!cancelled && latest) setServed(latest);
    }

    watchVersionHistory((next) => {
      if (cancelled) return;
      setHistory(next);
      void check();
    })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      })
      .catch((err) => console.warn("Watching Remote Config failed:", err));

    void check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      stop?.();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const prompt: VersionPrompt = decidePrompt(RUNNING_BUILD, served, history, dismissed);

  const later = useCallback(() => {
    if (prompt.kind === "none") return;
    try {
      localStorage.setItem(DISMISSED_KEY, prompt.dismissKey);
    } catch {
      // still hidden for this visit
    }
    setDismissed(prompt.dismissKey);
  }, [prompt]);

  const reload = useCallback(() => window.location.reload(), []);

  return { prompt, history, currentVersion: RUNNING_BUILD.version, later, reload };
}
