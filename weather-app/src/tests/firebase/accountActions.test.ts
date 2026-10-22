import { describe, expect, it } from "vitest";
import type { Auth, User, UserCredential } from "firebase/auth";
import {
  EMAIL_FOR_SIGN_IN_KEY,
  authErrorMessage,
  createAccountActions,
  validateNewPassword,
  type AccountSdk,
} from "../../firebaseService/accountActions";

const fakeAuth = { name: "fake-auth" } as unknown as Auth;
const fail = (code: string) => async () => {
  throw Object.assign(new Error(code), { code });
};

function setup(overrides: Partial<AccountSdk> = {}, stored: Record<string, string> = {}) {
  const calls = {
    reset: [] as unknown[][],
    link: [] as unknown[][],
    signIn: [] as unknown[][],
    verify: [] as unknown[][],
    confirm: [] as unknown[][],
  };
  const store = new Map<string, string>(Object.entries(stored));

  const sdk: AccountSdk = {
    sendPasswordResetEmail: async (...args) => {
      calls.reset.push(args);
    },
    verifyPasswordResetCode: async () => "ada@example.com",
    confirmPasswordReset: async (...args) => {
      calls.confirm.push(args);
    },
    sendSignInLinkToEmail: async (...args) => {
      calls.link.push(args);
    },
    isSignInWithEmailLink: () => true,
    signInWithEmailLink: async (...args) => {
      calls.signIn.push(args);
      return {} as UserCredential;
    },
    sendEmailVerification: async (...args) => {
      calls.verify.push(args);
    },
    ...overrides,
  };

  const actions = createAccountActions({
    auth: fakeAuth,
    sdk,
    getOrigin: () => "https://app.example.com",
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
      removeItem: (key) => {
        store.delete(key);
      },
    },
  });

  return { actions, calls, store };
}

describe("TC-AUTH-101 forgot password", () => {
  it("sends the reset email with a return address on this site", async () => {
    const { actions, calls } = setup();
    const result = await actions.requestPasswordReset("  ada@example.com ");

    expect(result.ok).toBe(true);
    expect(calls.reset).toEqual([[fakeAuth, "ada@example.com", { url: "https://app.example.com/" }]]);
  });

  it("gives the same answer when no account exists, so it cannot be used to probe for accounts", async () => {
    const known = await setup().actions.requestPasswordReset("ada@example.com");
    const unknown = await setup({ sendPasswordResetEmail: fail("auth/user-not-found") }).actions.requestPasswordReset(
      "nobody@example.com"
    );

    expect(unknown).toEqual(known);
  });

  it("rejects an invalid address without calling Firebase", async () => {
    const { actions, calls } = setup();
    const result = await actions.requestPasswordReset("not-an-email");

    expect(result).toEqual({ ok: false, message: "Enter a valid email address." });
    expect(calls.reset).toEqual([]);
  });

  it("turns rate limiting into a readable message", async () => {
    const { actions } = setup({ sendPasswordResetEmail: fail("auth/too-many-requests") });

    expect(await actions.requestPasswordReset("ada@example.com")).toEqual({
      ok: false,
      message: "Too many attempts. Wait a few minutes and try again.",
    });
  });
});

describe("TC-AUTH-102 email link sign-in", () => {
  it("sends a link that finishes in this app and remembers the email", async () => {
    const { actions, calls, store } = setup();
    const result = await actions.sendSignInLink("ada@example.com");

    expect(result.ok).toBe(true);
    expect(calls.link).toEqual([
      [fakeAuth, "ada@example.com", { url: "https://app.example.com/", handleCodeInApp: true }],
    ]);
    expect(store.get(EMAIL_FOR_SIGN_IN_KEY)).toBe("ada@example.com");
  });

  it("does not remember the email when sending fails", async () => {
    const { actions, store } = setup({ sendSignInLinkToEmail: fail("auth/unauthorized-continue-uri") });
    const result = await actions.sendSignInLink("ada@example.com");

    expect(result.ok).toBe(false);
    expect(store.get(EMAIL_FOR_SIGN_IN_KEY)).toBe(undefined);
  });

  it("ignores a page address that is not a sign-in link", async () => {
    const { actions, calls } = setup({ isSignInWithEmailLink: () => false });

    expect(await actions.completeSignInWithLink("https://app.example.com/")).toEqual({ status: "not-a-link" });
    expect(calls.signIn).toEqual([]);
  });

  it("asks for the email when the link is opened on another device", async () => {
    const { actions, calls } = setup();

    expect(await actions.completeSignInWithLink("https://app.example.com/?oobCode=x")).toEqual({
      status: "needs-email",
    });
    expect(calls.signIn).toEqual([]);
  });

  it("signs in with the remembered email and then forgets it", async () => {
    const link = "https://app.example.com/?oobCode=x";
    const { actions, calls, store } = setup({}, { [EMAIL_FOR_SIGN_IN_KEY]: "ada@example.com" });

    expect(await actions.completeSignInWithLink(link)).toEqual({ status: "signed-in" });
    expect(calls.signIn).toEqual([[fakeAuth, "ada@example.com", link]]);
    expect(store.get(EMAIL_FOR_SIGN_IN_KEY)).toBe(undefined);
  });

  it("uses the email the person typed when nothing was remembered", async () => {
    const link = "https://app.example.com/?oobCode=x";
    const { actions, calls } = setup();

    expect(await actions.completeSignInWithLink(link, "ada@example.com")).toEqual({ status: "signed-in" });
    expect(calls.signIn).toEqual([[fakeAuth, "ada@example.com", link]]);
  });

  it("reports an expired link", async () => {
    const { actions } = setup({ signInWithEmailLink: fail("auth/expired-action-code") }, { [EMAIL_FOR_SIGN_IN_KEY]: "ada@example.com" });

    expect(await actions.completeSignInWithLink("https://app.example.com/?oobCode=x")).toEqual({
      status: "error",
      message: "This link has expired. Request a new one.",
    });
  });
});

describe("TC-AUTH-103 email verification", () => {
  it("sends the verification email and names the address", async () => {
    const { actions, calls } = setup();
    const user = { email: "ada@example.com" } as unknown as User;

    expect(await actions.resendVerification(user)).toEqual({
      ok: true,
      message: "Verification email sent to ada@example.com.",
    });
    expect(calls.verify).toEqual([[user, { url: "https://app.example.com/" }]]);
  });
});

describe("TC-AUTH-104 choose a new password", () => {
  it("checks the code and returns the account's email", async () => {
    expect(await setup().actions.checkResetCode("code")).toEqual({ ok: true, email: "ada@example.com" });
  });

  it("reports an invalid or used code", async () => {
    const { actions } = setup({ verifyPasswordResetCode: fail("auth/invalid-action-code") });

    expect(await actions.checkResetCode("code")).toEqual({
      ok: false,
      message: "This link is invalid or has already been used. Request a new one.",
    });
  });

  it("rejects a short password and a mismatch before calling Firebase", async () => {
    const { actions, calls } = setup();

    expect((await actions.finishPasswordReset("code", "short", "short")).ok).toBe(false);
    expect((await actions.finishPasswordReset("code", "longenough1", "different1")).ok).toBe(false);
    expect(calls.confirm).toEqual([]);
  });

  it("saves a valid new password with the code", async () => {
    const { actions, calls } = setup();

    expect((await actions.finishPasswordReset("code", "longenough1", "longenough1")).ok).toBe(true);
    expect(calls.confirm).toEqual([[fakeAuth, "code", "longenough1"]]);
  });
});

describe("TC-AUTH-105 messages and password rules", () => {
  it("falls back to a general message for unknown codes", () => {
    expect(authErrorMessage("auth/something-new")).toBe("Something went wrong. Please try again.");
  });

  it("accepts a password of at least 8 characters that matches its confirmation", () => {
    expect(validateNewPassword("longenough1", "longenough1")).toBe("");
  });

  it("explains a short password", () => {
    expect(validateNewPassword("short", "short")).toBe("Use at least 8 characters.");
  });

  it("explains a mismatch", () => {
    expect(validateNewPassword("longenough1", "longenough2")).toBe("The two passwords do not match.");
  });
});
