import { describe, expect, it } from "vitest";
import { getDisplayName, getInitials } from "../../utils/accountDisplay";

describe("TC-UI-004 account row name and avatar initials", () => {
  it("shows the display name when there is one", () => {
    expect(getDisplayName({ displayName: "Ada Lovelace", email: "ada@example.com" })).toBe(
      "Ada Lovelace"
    );
  });

  it("falls back to the email, then to a generic label", () => {
    expect(getDisplayName({ displayName: null, email: "ada@example.com" })).toBe("ada@example.com");
    expect(getDisplayName({ displayName: "   ", email: null })).toBe("Your account");
  });

  it("uses the first and last initials of a full name", () => {
    expect(getInitials({ displayName: "Ada Lovelace", email: null })).toBe("AL");
    expect(getInitials({ displayName: "ada king lovelace", email: null })).toBe("AL");
  });

  it("uses one initial for a single name", () => {
    expect(getInitials({ displayName: "Ada", email: null })).toBe("A");
  });

  it("uses the first letter of the email when there is no name", () => {
    expect(getInitials({ displayName: null, email: "ada@example.com" })).toBe("A");
  });

  it("shows a question mark when there is nothing to go on", () => {
    expect(getInitials({ displayName: null, email: null })).toBe("?");
  });

  it("does not split an emoji in half", () => {
    expect(getInitials({ displayName: "😀 Smith", email: null })).toBe("😀S");
  });
});
