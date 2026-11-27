// Release history from Remote Config ("version_history") and the decision of
// whether to prompt someone to reload. Plain functions, so they can be tested.

export interface Release {
  version: string; // "1.5.0"
  date: string; // "2026-11-27"
  notes: string[];
}

export interface BuildInfo {
  version: string; // from package.json
  build: string; // commit ID (or build time), unique per deploy
}

export type VersionPrompt =
  | { kind: "none" }
  | { kind: "release"; release: Release; dismissKey: string }
  | { kind: "generic"; dismissKey: string };

const SEMVER = /^\d+\.\d+\.\d+$/;

// "1.10.0" > "1.9.2"
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

// Reads the console's JSON. Anything malformed is skipped (with a warning)
// rather than breaking the app. Returned newest first.
export function parseVersionHistory(raw: string): Release[] {
  if (!raw.trim()) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn("Remote Config version_history is not valid JSON; ignoring it.");
    return [];
  }

  if (!Array.isArray(data)) {
    console.warn("Remote Config version_history should be a list; ignoring it.");
    return [];
  }

  const releases: Release[] = [];
  for (const item of data) {
    const entry = item as Partial<Release>;
    if (typeof entry?.version !== "string" || !SEMVER.test(entry.version.trim())) {
      console.warn("Skipping a version_history entry without a valid version:", item);
      continue;
    }
    releases.push({
      version: entry.version.trim(),
      date: typeof entry.date === "string" ? entry.date : "",
      notes: Array.isArray(entry.notes)
        ? entry.notes.filter((note): note is string => typeof note === "string" && note.trim() !== "")
        : [],
    });
  }

  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

// running = the build in this tab; served = what version.json says is live now
// (null when unknown); history = Remote Config; dismissed = what "Later" hid.
export function decidePrompt(
  running: BuildInfo,
  served: BuildInfo | null,
  history: Release[],
  dismissed: string | null
): VersionPrompt {
  // Only prompt once a different build is actually live, so a reload
  // really brings the new version.
  if (!served || served.build === running.build) return { kind: "none" };

  // Notes only when the live version has its own history entry; a deploy
  // nobody wrote an entry for gets the plain prompt (never older notes).
  const release = history.find((entry) => compareVersions(entry.version, served.version) === 0);
  const isNewer = !release || compareVersions(release.version, running.version) > 0;

  // "Later" hides this deploy only, so any later deploy prompts again.
  const dismissKey = `build:${served.build}`;
  const prompt: VersionPrompt =
    release && isNewer ? { kind: "release", release, dismissKey } : { kind: "generic", dismissKey };

  return prompt.dismissKey === dismissed ? { kind: "none" } : prompt;
}
