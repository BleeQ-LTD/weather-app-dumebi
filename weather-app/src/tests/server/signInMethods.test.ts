import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/app";
import { isGoogleOnlyAccount } from "../../server/signInMethods";

const openServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
  );
});

async function start(lookupProviders?: (email: string) => Promise<string[] | null>) {
  const app = createApp({
    appOrigin: "http://localhost:5174",
    generateLink: vi.fn(),
    sendMail: vi.fn(),
    lookupProviders,
  });
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  openServers.push(server);
  const { port } = server.address() as AddressInfo;

  return (body: unknown) =>
    fetch(`http://127.0.0.1:${port}/api/sign-in-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
}

describe("Google-only account check", () => {
  it("is true only for an existing account with Google and no password", async () => {
    const lookup = vi.fn(async (email: string) =>
      email === "google@example.com"
        ? ["google.com"]
        : email === "both@example.com"
          ? ["google.com", "password"]
          : email === "pass@example.com"
            ? ["password"]
            : null
    );

    expect(await isGoogleOnlyAccount("Google@Example.com ", lookup)).toBe(true);
    expect(await isGoogleOnlyAccount("both@example.com", lookup)).toBe(false);
    expect(await isGoogleOnlyAccount("pass@example.com", lookup)).toBe(false);
    expect(await isGoogleOnlyAccount("nobody@example.com", lookup)).toBe(false);
    expect(await isGoogleOnlyAccount("not-an-email", lookup)).toBe(false);
    expect(lookup).not.toHaveBeenCalledWith("not-an-email");
  });

  it("POST /api/sign-in-methods answers googleOnly", async () => {
    const post = await start(async (email) => (email === "google@example.com" ? ["google.com"] : null));

    expect(await (await post({ email: "google@example.com" })).json()).toEqual({ googleOnly: true });
    expect(await (await post({ email: "other@example.com" })).json()).toEqual({ googleOnly: false });
  });

  it("answers false when the server has no lookup configured", async () => {
    const post = await start();
    expect(await (await post({ email: "google@example.com" })).json()).toEqual({ googleOnly: false });
  });

  it("limits how often one address can ask", async () => {
    const post = await start(async () => null);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await post({ email: `a${i}@example.com` })).status);
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
