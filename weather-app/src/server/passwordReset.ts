const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface PasswordResetDeps {
  // Where the reset page lives, for example http://localhost:5174
  appOrigin: string;
  // Returns Firebase's reset link for this email (throws auth/user-not-found if there is no account)
  generateLink: (email: string) => Promise<string>;
  sendMail: (message: MailMessage) => Promise<void>;
}

export type PasswordResetOutcome = "sent" | "no-account" | "invalid-email";

export function isValidEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }

  return "";
}

// Keeps only the one-time code from Firebase's link and points it at our own page.
export function buildResetUrl(firebaseLink: string, appOrigin: string): string {
  const code = new URL(firebaseLink).searchParams.get("oobCode");

  if (!code) {
    throw new Error("Firebase reset link did not contain a code.");
  }

  const url = new URL("/", appOrigin);
  url.searchParams.set("mode", "resetPassword");
  url.searchParams.set("oobCode", code);

  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildResetEmail(to: string, resetUrl: string): MailMessage {
  return {
    to,
    subject: "Reset your Weather password",
    text: [
      "We received a request to reset your password.",
      "",
      "Open this link to choose a new one:",
      resetUrl,
      "",
      "If you did not ask for this, you can ignore this email.",
      "The link works once and expires soon.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your password.</p>",
      `<p><a href="${escapeHtml(resetUrl)}">Choose a new password</a></p>`,
      "<p>If you did not ask for this, you can ignore this email. The link works once and expires soon.</p>",
    ].join(""),
  };
}

// An unknown email is not an error: the caller answers the same way either
// way, so this cannot be used to find out which emails have accounts.
export async function requestPasswordReset(
  rawEmail: unknown,
  deps: PasswordResetDeps
): Promise<PasswordResetOutcome> {
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  if (!isValidEmail(email)) return "invalid-email";

  let firebaseLink: string;

  try {
    firebaseLink = await deps.generateLink(email);
  } catch (error) {
    if (errorCode(error) === "auth/user-not-found") return "no-account";
    throw error;
  }

  const resetUrl = buildResetUrl(firebaseLink, deps.appOrigin);
  await deps.sendMail(buildResetEmail(email, resetUrl));

  return "sent";
}
