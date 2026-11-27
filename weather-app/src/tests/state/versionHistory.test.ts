import { describe, expect, it, vi } from "vitest";
import { compareVersions, decidePrompt, parseVersionHistory } from "../../state/versionHistory";

const history = [
  { version: "1.1.0", date: "2026-12-04", notes: ["Recent searches"] },
  { version: "1.0.0", date: "2026-11-27", notes: ["Compare two cities"] },
];
const running = { version: "1.0.0", build: "aaa" };

describe("version history", () => {
  it("compares version numbers as numbers", () => {
    expect(compareVersions("1.10.0", "1.9.2")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.9.9", "1.0.0")).toBeLessThan(0);
  });

  it("reads the console JSON, newest first, skipping bad entries", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = parseVersionHistory(
      JSON.stringify([
        { version: "1.0.0", date: "2026-11-27", notes: ["A", 3, ""] },
        { version: "v2", notes: [] },
        { version: "1.2.0" },
      ])
    );
    expect(parsed).toEqual([
      { version: "1.2.0", date: "", notes: [] },
      { version: "1.0.0", date: "2026-11-27", notes: ["A"] },
    ]);
  });

  it("ignores malformed JSON instead of breaking", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseVersionHistory("{not json")).toEqual([]);
    expect(parseVersionHistory('{"version":"1.0.0"}')).toEqual([]);
    expect(parseVersionHistory("")).toEqual([]);
  });
});

describe("when to prompt", () => {
  it("stays quiet while this tab is the live build", () => {
    expect(decidePrompt(running, { version: "1.0.0", build: "aaa" }, history, null).kind).toBe("none");
  });

  it("stays quiet until the new build is actually live", () => {
    // Console already says 1.1.0, but version.json still serves 1.0.0
    expect(decidePrompt(running, null, history, null).kind).toBe("none");
  });

  it("shows the release and its notes once it is live", () => {
    const prompt = decidePrompt(running, { version: "1.1.0", build: "bbb" }, history, null);
    expect(prompt).toMatchObject({ kind: "release", release: { version: "1.1.0" }, dismissKey: "build:bbb" });
  });

  it("still prompts, without notes, when nobody added a history entry", () => {
    const prompt = decidePrompt(running, { version: "1.0.0", build: "ccc" }, history, null);
    expect(prompt).toEqual({ kind: "generic", dismissKey: "build:ccc" });
  });

  it("never shows an older release's notes for a version with no entry", () => {
    // package.json bumped to 1.2.0, console entry forgotten
    const prompt = decidePrompt(running, { version: "1.2.0", build: "eee" }, history, null);
    expect(prompt).toEqual({ kind: "generic", dismissKey: "build:eee" });
  });

  it("'Later' hides that deploy until another one goes live", () => {
    const served = { version: "1.1.0", build: "bbb" };
    expect(decidePrompt(running, served, history, "build:bbb").kind).toBe("none");

    // a hotfix redeploy of 1.1.0 prompts again
    expect(decidePrompt(running, { version: "1.1.0", build: "bbb2" }, history, "build:bbb")).toMatchObject({
      kind: "release",
      release: { version: "1.1.0" },
    });
  });
});
