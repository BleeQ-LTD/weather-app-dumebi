import { getApp } from "firebase/app";
import {
  activate,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  onConfigUpdate,
  type RemoteConfig,
} from "firebase/remote-config";
import { parseVersionHistory, type Release } from "../state/versionHistory";

// Remote Config parameter (JSON, newest first) edited in the Firebase console
// after each release. See README → "Releasing a new version".
const VERSION_HISTORY_KEY = "version_history";

const ONE_HOUR_MS = 60 * 60 * 1000;

function createRemoteConfig(): RemoteConfig {
  const remoteConfig = getRemoteConfig(getApp());
  // A plain fetch is cached; the live listener below is what reacts quickly.
  remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : ONE_HOUR_MS;
  remoteConfig.defaultConfig = { [VERSION_HISTORY_KEY]: "[]" };
  return remoteConfig;
}

function readHistory(remoteConfig: RemoteConfig): Release[] {
  return parseVersionHistory(getValue(remoteConfig, VERSION_HISTORY_KEY).asString());
}

// Calls onChange with the release history now, and again whenever a new
// template is published (needs the Remote Config Realtime API enabled).
// Returns a function that stops listening.
export async function watchVersionHistory(
  onChange: (history: Release[]) => void
): Promise<() => void> {
  let remoteConfig: RemoteConfig;
  try {
    remoteConfig = createRemoteConfig();
  } catch (err) {
    console.warn("Remote Config is not available here:", err);
    return () => {};
  }

  try {
    await fetchAndActivate(remoteConfig);
  } catch (err) {
    console.warn("Remote Config fetch failed; release notes unavailable for now:", err);
  }
  onChange(readHistory(remoteConfig));

  try {
    return onConfigUpdate(remoteConfig, {
      next: (update) => {
        if (!update.getUpdatedKeys().has(VERSION_HISTORY_KEY)) return;
        void activate(remoteConfig).then(() => onChange(readHistory(remoteConfig)));
      },
      error: (err) =>
        console.warn("Live Remote Config updates unavailable; falling back to periodic checks:", err),
      complete: () => {},
    });
  } catch (err) {
    console.warn("Live Remote Config updates are not supported here:", err);
    return () => {};
  }
}
