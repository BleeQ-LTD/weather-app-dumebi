import express from "express";
import type { NextFunction, Request, Response } from "express";
import { isValidEmail, requestPasswordReset } from "./passwordReset.js";
import type { PasswordResetDeps } from "./passwordReset.js";
import { createRateLimiter } from "./rateLimiter.js";

function statusOf(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }

  return 500;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const suffix = typeof code === "string" ? ` [${code}]` : "";
    return `${error.name}${suffix}: ${error.message}`;
  }

  return String(error);
}

function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = statusOf(error);

  // Bad input such as malformed JSON.
  if (status >= 400 && status < 500) {
    res.status(status).json({ message: "Invalid request." });
    return;
  }

  console.error("Request failed:", describeError(error));
  res
    .status(500)
    .json({ message: "We couldn't send the email. Please try again." });
}

export function createApp(deps: PasswordResetDeps) {
  const app = express();

  app.use(express.json({ limit: "10kb" }));

  // At most 5 requests per address every 15 minutes, and one email per
  // account per minute, so the route cannot be used to flood someone's inbox.
  const allowPerIp = createRateLimiter(5, 15 * 60 * 1000);
  const allowPerEmail = createRateLimiter(1, 60 * 1000);

  app.get("/api/hello", (_req, res) => {
    res.json({ message: "Hello from Node.js!" });
  });

  app.post("/api/password-reset", async (req, res) => {
    if (!allowPerIp(req.ip ?? "unknown")) {
      res
        .status(429)
        .json({ message: "Too many requests. Please try again later." });
      return;
    }

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const validEmail = isValidEmail(email);

    // A repeat within the minute is accepted but not sent again.
    if (validEmail && !allowPerEmail(email)) {
      res.json({ ok: true });
      return;
    }

    try {
      const outcome = await requestPasswordReset(email, deps);

      if (outcome === "invalid-email") {
        res.status(400).json({ message: "Enter a valid email address." });
        return;
      }

      // Same answer whether or not the account exists.
      res.json({ ok: true });
    } catch (error) {
      // A failed send must not use up the minute, or the retry would be
      // accepted without anything being sent.
      if (validEmail) allowPerEmail.release(email);
      throw error;
    }
  });

  app.use(errorHandler);

  return app;
}
