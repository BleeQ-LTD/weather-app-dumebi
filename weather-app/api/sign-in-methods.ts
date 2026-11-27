import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Vercel version of POST /api/sign-in-methods (the dev server has the same
// route in src/server/app.ts). After a failed email + password sign-in, says
// whether the email belongs to an account that only signs in with Google, so
// the app can suggest "Sign in with Google" and "Set a password".
//
// Needs the same variables as api/password-reset.ts:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per instance only (serverless instances don't share memory), but it still
// slows down anyone trying to list which emails are registered.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function allow(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

function firebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") }),
    });

  return getAuth(app);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || "unknown";

  if (!allow(ip)) {
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return res.status(200).json({ googleOnly: false });
  }

  try {
    const user = await firebaseAuth().getUserByEmail(email);
    const providers = user.providerData.map((provider) => provider.providerId);

    return res.status(200).json({
      googleOnly: providers.includes("google.com") && !providers.includes("password"),
    });
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") {
      return res.status(200).json({ googleOnly: false });
    }

    console.error("Sign-in method lookup failed:", (error as { code?: string }).code ?? "unknown error");
    return res.status(500).json({ message: "Lookup failed." });
  }
}
