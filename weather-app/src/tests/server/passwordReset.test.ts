import { describe, expect, it, vi } from "vitest";
import {
  buildResetEmail,
  buildResetUrl,
  requestPasswordReset,
  type PasswordResetDeps,
} from "../../server/passwordReset";
import { createRateLimiter } from "../../server/rateLimiter";

const APP_ORIGIN = "http://localhost:5174";
const FIREBASE_LINK =
  "https://example-project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=code-123&apiKey=public-key&lang=en";

function makeDeps(overrides: Partial<PasswordResetDeps> = {}) {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const generateLink = vi.fn().mockResolvedValue(FIREBASE_LINK);

  const deps: PasswordResetDeps = {
    appOrigin: APP_ORIGIN,
    generateLink,
    sendMail,
    ...overrides,
  };

  return { deps, generateLink, sendMail };
}

describe("TC-SRV-001 reset link", () => {
  it("points the one-time code at our own page", () => {
    const url = new URL(buildResetUrl(FIREBASE_LINK, APP_ORIGIN));

    expect(url.origin).toBe(APP_ORIGIN);
    expect(url.searchParams.get("mode")).toBe("resetPassword");
    expect(url.searchParams.get("oobCode")).toBe("code-123");
  });

  it("does not carry over Firebase's host or other parameters", () => {
    const url = buildResetUrl(FIREBASE_LINK, APP_ORIGIN);

    expect(url).not.toContain("firebaseapp.com");
    expect(url).not.toContain("apiKey");
  });

  it("refuses a link that has no code", () => {
    expect(() =>
      buildResetUrl("https://example-project.firebaseapp.com/__/auth/action", APP_ORIGIN)
    ).toThrow("did not contain a code");
  });
});

describe("TC-SRV-002 reset email", () => {
  it("contains the link in the text and html versions", () => {
    const message = buildResetEmail("ada@example.com", "http://localhost:5174/?mode=resetPassword&oobCode=code-123");

    expect(message.to).toBe("ada@example.com");
    expect(message.text).toContain("http://localhost:5174/?mode=resetPassword&oobCode=code-123");
    expect(message.html).toContain("oobCode=code-123");
  });

  it("escapes the link inside the html", () => {
    const message = buildResetEmail("ada@example.com", "http://localhost:5174/?a=1&b=2");

    expect(message.html).toContain("a=1&amp;b=2");
  });
});

describe("TC-SRV-003 requesting a password reset", () => {
  it("emails our own reset page to the address", async () => {
    const { deps, generateLink, sendMail } = makeDeps();

    expect(await requestPasswordReset("  ada@example.com ", deps)).toBe("sent");
    expect(generateLink).toHaveBeenCalledWith("ada@example.com");
    expect(sendMail).toHaveBeenCalledTimes(1);

    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe("ada@example.com");
    expect(message.text).toContain(`${APP_ORIGIN}/?mode=resetPassword&oobCode=code-123`);
    expect(message.text).not.toContain("firebaseapp.com");
  });

  it("rejects an invalid address without calling Firebase or the mailer", async () => {
    const { deps, generateLink, sendMail } = makeDeps();

    expect(await requestPasswordReset("not-an-email", deps)).toBe("invalid-email");
    expect(await requestPasswordReset(undefined, deps)).toBe("invalid-email");
    expect(generateLink).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends nothing when no account exists, and reports it without failing", async () => {
    const { deps, sendMail } = makeDeps({
      generateLink: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
    });

    expect(await requestPasswordReset("nobody@example.com", deps)).toBe("no-account");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("passes on other Firebase errors", async () => {
    const { deps } = makeDeps({
      generateLink: vi.fn().mockRejectedValue({ code: "auth/internal-error" }),
    });

    await expect(requestPasswordReset("ada@example.com", deps)).rejects.toEqual({
      code: "auth/internal-error",
    });
  });

  it("passes on a mail failure instead of pretending it was sent", async () => {
    const { deps } = makeDeps({
      sendMail: vi.fn().mockRejectedValue(new Error("mail down")),
    });

    await expect(requestPasswordReset("ada@example.com", deps)).rejects.toThrow("mail down");
  });
});

describe("TC-SRV-004 rate limiter", () => {
  it("allows up to the limit, then blocks", () => {
    const allow = createRateLimiter(2, 1000, () => 0);

    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
  });

  it("counts each key separately", () => {
    const allow = createRateLimiter(1, 1000, () => 0);

    expect(allow("a")).toBe(true);
    expect(allow("b")).toBe(true);
    expect(allow("a")).toBe(false);
  });

  it("gives a slot back when it is released", () => {
    const allow = createRateLimiter(1, 1000, () => 0);

    expect(allow("a")).toBe(true);
    allow.release("a");
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
  });

  it("allows again once the window has passed", () => {
    let time = 0;
    const allow = createRateLimiter(1, 1000, () => time);

    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);

    time = 1000;
    expect(allow("a")).toBe(true);
  });
});
