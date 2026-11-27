import { describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: vi.fn() },
  GoogleAuthProvider: vi.fn(),
  linkWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
}));

import { hasPassword, setAccountPassword, SetPasswordError } from "../../firebaseService/passwordLink";

const googleUser = {
  email: "mebi@example.com",
  providerData: [{ providerId: "google.com" }],
} as unknown as User;

function sdk(linkResults: Array<unknown>) {
  const link = vi.fn();
  for (const result of linkResults) {
    if (result instanceof Error || (typeof result === "object" && result && "code" in result)) {
      link.mockRejectedValueOnce(result);
    } else link.mockResolvedValueOnce(result);
  }
  return {
    credential: vi.fn((email: string, password: string) => ({ email, password })),
    link,
    reauthenticate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("setting a password on a Google account", () => {
  it("knows whether the account already has a password", () => {
    expect(hasPassword(googleUser)).toBe(false);
    expect(
      hasPassword({ providerData: [{ providerId: "google.com" }, { providerId: "password" }] } as unknown as User)
    ).toBe(true);
  });

  it("links an email + password credential for the account's email", async () => {
    const fake = sdk(["ok"]);
    await setAccountPassword(googleUser, "longenough", "longenough", fake);
    expect(fake.credential).toHaveBeenCalledWith("mebi@example.com", "longenough");
    expect(fake.link).toHaveBeenCalledTimes(1);
    expect(fake.reauthenticate).not.toHaveBeenCalled();
  });

  it("rejects short or mismatched passwords before calling Firebase", async () => {
    const fake = sdk([]);
    await expect(setAccountPassword(googleUser, "short", "short", fake)).rejects.toMatchObject({
      code: "auth/weak-password",
    });
    await expect(setAccountPassword(googleUser, "longenough", "different1", fake)).rejects.toMatchObject({
      code: "app/passwords-differ",
    });
    expect(fake.link).not.toHaveBeenCalled();
  });

  it("confirms with Google and retries when Firebase needs a recent sign-in", async () => {
    const fake = sdk([{ code: "auth/requires-recent-login" }, "ok"]);
    await setAccountPassword(googleUser, "longenough", "longenough", fake);
    expect(fake.reauthenticate).toHaveBeenCalledTimes(1);
    expect(fake.link).toHaveBeenCalledTimes(2);
  });

  it("turns Firebase errors into friendly messages", async () => {
    const fake = sdk([{ code: "auth/provider-already-linked" }]);
    const error = await setAccountPassword(googleUser, "longenough", "longenough", fake).catch((e) => e);
    expect(error).toBeInstanceOf(SetPasswordError);
    expect(error.message).toBe("This account already has a password.");
  });
});
