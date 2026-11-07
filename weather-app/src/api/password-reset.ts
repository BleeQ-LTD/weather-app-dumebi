
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import nodemailer from "nodemailer";

const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://weather-vercel.bleeq.app";

const RESET_MESSAGE =
  "If an account exists for that address, we have sent a link to reset the password.";

function getFirebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });

  return getAuth(app);
}

function getMailer() {
  const email = process.env.SMTP_USER;
  const password = process.env.SMTP_APP_PASSWORD;

  if (!email || !password) {
    throw new Error("Gmail SMTP credentials are not configured.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password,
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

async function sendResetEmail(email: string, resetUrl: string) {
  const smtpUser = process.env.SMTP_USER!;
  const senderName = process.env.SMTP_FROM_NAME ?? "Weather App";

  const safeEmail = escapeHtml(email);

  await getMailer().sendMail({
    from: `"${senderName}" <${smtpUser}>`,
    to: email,
    subject: "Reset your Weather App password",
    text: [
      "We received a request to reset your Weather App password.",
      "",
      `Reset your password using this link: ${resetUrl}`,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:30px auto;padding:28px;color:#1f2937;border:1px solid #e5e7eb;border-radius:12px;">
        <h1 style="font-size:24px;">Reset your password</h1>
        <p>Hello,</p>
        <p>We received a request to reset the password for <strong>${safeEmail}</strong>.</p>
        <p>Click the button below to choose a new password.</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;display:inline-block;">
            Reset password
          </a>
        </p>
        <p>If the button doesn't work, copy this link into your browser:</p>
        <p style="word-break:break-all;">${resetUrl}</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;">Weather App</p>
      </div>
    `,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim()
      : "";

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      code: "auth/invalid-email",
      message: "Enter a valid email address.",
    });
  }

  try {
    const firebaseAuth = getFirebaseAuth();

    const generatedLink =
      await firebaseAuth.generatePasswordResetLink(email, {
        url: APP_BASE_URL,
        handleCodeInApp: false,
      });

    const actionUrl = new URL(generatedLink);
    const code = actionUrl.searchParams.get("oobCode");

    if (!code) {
      throw new Error(
        "Firebase did not return a password-reset code."
      );
    }

    const resetUrl = new URL("/", APP_BASE_URL);

    resetUrl.searchParams.set("mode", "resetPassword");
    resetUrl.searchParams.set("oobCode", code);

    await sendResetEmail(email, resetUrl.toString());

    return res.status(200).json({
      message: RESET_MESSAGE,
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(error.code)
        : "";

    // Do not reveal whether an account exists.
    if (code === "auth/user-not-found") {
      return res.status(200).json({
        message: RESET_MESSAGE,
      });
    }

    console.error(
      "Password-reset request failed:",
      code || "unknown error"
    );

    return res.status(500).json({
      code: "auth/internal-error",
      message: "Unable to send the reset email. Please try again.",
    });
  }
}
