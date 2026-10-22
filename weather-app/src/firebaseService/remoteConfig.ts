import { getApp } from "firebase/app";
import {
  activate,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  onConfigUpdate,
  type RemoteConfig,
} from "firebase/remote-config";
import { toNotice, type UpdateNotice } from "../state/updateNotice";

const ONE_HOUR_MS = 60 * 60 * 1000;

function createRemoteConfig(): RemoteConfig {
  const remoteConfig = getRemoteConfig(getApp());
  remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : ONE_HOUR_MS;
  remoteConfig.defaultConfig = { update_message: "", update_id: "" };
  return remoteConfig;
}

function readNotice(remoteConfig: RemoteConfig): UpdateNotice | null {
  return toNotice(
    getValue(remoteConfig, "update_message").asString(),
    getValue(remoteConfig, "update_id").asString()
  );
}

export async function watchUpdateNotice(
  onChange: (notice: UpdateNotice | null) => void
): Promise<() => void> {
  let remoteConfig: RemoteConfig;
  try {
    remoteConfig = createRemoteConfig();
  } catch (err) {
    console.error("Remote Config is not available here:", err);
    return () => {};
  }

  try {
    await fetchAndActivate(remoteConfig);
  } catch (err) {
    console.error("Remote Config fetch failed, using defaults:", err);
  }
  onChange(readNotice(remoteConfig));

  try {
    return onConfigUpdate(remoteConfig, {
      next: () => {
        void activate(remoteConfig).then(() => onChange(readNotice(remoteConfig)));
      },
      error: (err) => console.error("Remote Config update stream failed:", err),
      complete: () => {},
    });
  } catch (err) {
    console.error("Real-time Remote Config is not supported here:", err);
    return () => {};
  }
}