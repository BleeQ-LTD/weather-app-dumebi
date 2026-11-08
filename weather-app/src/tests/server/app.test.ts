import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/app";
import type { PasswordResetDeps } from "../../server/passwordReset";

const FIREBASE_LINK =
  "https://example-project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=code-123&apiKey=public-key";

const openServers: Server[] = [];

async function startServer(overrides: Partial<PasswordResetDeps> = {}) {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const generateLink = vi.fn().mockResolvedValue(FIREBASE_LINK);

  const app = createApp({
    appOrigin: "http://localhost:5174",
    generateLink,
    sendMail,
    ...overrides,
  });

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  openServers.push(server);

  const { port } = server.address() as AddressInfo;

  function post(body: unknown) {
    return fetch(`http://127.0.0.1:${port}/api/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  return { post, sendMail, generateLink };
}

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
});

describe("TC-SRV-006 POST /api/password-reset", () => {
  it("emails a reset link and answers ok", async () => {
    const { post, sendMail } = await startServer();

    const response = await post({ email: "ada@example.com" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("answers the same way when the account does not exist, and sends nothing", async () => {
    const { post, sendMail } = await startServer({
      generateLink: vi.fn().mockRejectedValue({ code: "auth/user-not-found" }),
    });

    const response = await post({ email: "nobody@example.com" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects an invalid email with 400", async () => {
    const { post, sendMail } = await startServer();

    const response = await post({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Enter a valid email address." });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects a missing email with 400", async () => {
    const { post } = await startServer();

    expect((await post({})).status).toBe(400);
  });

  it("rejects malformed JSON with 400 instead of a server error", async () => {
    const { post } = await startServer();

    const response = await post("{not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid request." });
  });

  it("does not send a second email for the same address within a minute", async () => {
    const { post, sendMail } = await startServer();

    const first = await post({ email: "ada@example.com" });
    const second = await post({ email: "ADA@example.com" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("lets the person retry straight away after a failed send, and really sends then", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const sendMail = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValue(undefined);
    const { post } = await startServer({ sendMail });

    const first = await post({ email: "ada@example.com" });
    const second = await post({ email: "ada@example.com" });

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("limits how many requests one address can make", async () => {
    const { post } = await startServer();

    for (let index = 0; index < 5; index += 1) {
      expect((await post({ email: `user${index}@example.com` })).status).toBe(200);
    }

    const blocked = await post({ email: "user5@example.com" });

    expect(blocked.status).toBe(429);
  });

  it("answers 500 with a safe message when the email cannot be sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { post } = await startServer({
      sendMail: vi.fn().mockRejectedValue(new Error("secret provider detail")),
    });

    const response = await post({ email: "ada@example.com" });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: "We couldn't send the email. Please try again." });
    expect(JSON.stringify(body)).not.toContain("secret provider detail");
  });
});
