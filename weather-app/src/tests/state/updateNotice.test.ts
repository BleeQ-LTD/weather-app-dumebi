import { describe, expect, it } from "vitest";
import { isUnseen, toNotice } from "../../state/updateNotice";

describe("TC-UPD-002 update notice", () => {
  it("returns a notice when both the message and the id are set", () => {
    expect(toNotice("A new version is live.", "2026-10-22-a")).toEqual({
      id: "2026-10-22-a",
      message: "A new version is live.",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(toNotice("  Reload  ", " id1 ")).toEqual({ id: "id1", message: "Reload" });
  });

  it("returns null when the message is empty, so nothing shows", () => {
    expect(toNotice("", "id1")).toBeNull();
    expect(toNotice("   ", "id1")).toBeNull();
  });

  it("returns null when the id is empty, so a half-filled entry never shows", () => {
    expect(toNotice("Reload", "")).toBeNull();
  });

  it("is unseen when the id differs from the stored one", () => {
    expect(isUnseen({ id: "b", message: "m" }, "a")).toBe(true);
  });

  it("is unseen when nothing has been stored yet", () => {
    expect(isUnseen({ id: "a", message: "m" }, null)).toBe(true);
  });

  it("is seen when the id matches the stored one", () => {
    expect(isUnseen({ id: "a", message: "m" }, "a")).toBe(false);
  });

  it("is never unseen when there is no notice", () => {
    expect(isUnseen(null, null)).toBe(false);
  });
});