import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import type { User } from "firebase/auth";

// Accounts made with "Sign up with Google" have no password, so the email +
// password form can never sign them in. This lets a signed-in Google user add
// a password to the same account; afterwards either way of signing in works.

export const MIN_PASSWORD_LENGTH = 8;

export function hasPassword(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === "password");
}

const MESSAGES: Record<string, string> = {
  "app/passwords-differ": "Your passwords do not match.",
  "auth/missing-email": "Your account has no email address, so a password can't be added.",
  "auth/weak-password": `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  "auth/provider-already-linked": "This account already has a password.",
  "auth/credential-already-in-use": "This email already has a separate password account.",
  "auth/email-already-in-use": "This email already has a separate password account.",
  "auth/popup-closed-by-user": "Google confirmation was cancelled. Please try again.",
  "auth/cancelled-popup-request": "Google confirmation was cancelled. Please try again.",
  "auth/popup-blocked": "Your browser blocked the Google popup. Allow popups and try again.",
  "auth/user-mismatch": "Please confirm with the same Google account you're signed in with.",
  "auth/network-request-failed": "Unable to connect. Please check your internet connection.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
};

export class SetPasswordError extends Error {
  code: string;

  constructor(code: string) {
    super(MESSAGES[code] ?? "Couldn't set your password. Please try again.");
    this.name = "SetPasswordError";
    this.code = code;
  }
}

function codeOf(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "unknown";
}

// Dependencies are passed in so this can be tested without Firebase.
export interface PasswordLinkSdk {
  credential: (email: string, password: string) => unknown;
  link: (user: User, credential: unknown) => Promise<unknown>;
  reauthenticate: (user: User) => Promise<unknown>;
}

const firebaseSdk: PasswordLinkSdk = {
  credential: (email, password) => EmailAuthProvider.credential(email, password),
  link: (user, credential) => linkWithCredential(user, credential as ReturnType<typeof EmailAuthProvider.credential>),
  reauthenticate: (user) => reauthenticateWithPopup(user, new GoogleAuthProvider()),
};

export async function setAccountPassword(
  user: User,
  password: string,
  confirmPassword: string,
  sdk: PasswordLinkSdk = firebaseSdk
): Promise<void> {
  if (!user.email) throw new SetPasswordError("auth/missing-email");
  if (password.length < MIN_PASSWORD_LENGTH) throw new SetPasswordError("auth/weak-password");
  if (password !== confirmPassword) throw new SetPasswordError("app/passwords-differ");

  const credential = sdk.credential(user.email, password);

  try {
    await sdk.link(user, credential);
  } catch (error) {
    // Firebase asks for a fresh sign-in before adding a password to an
    // account that was signed into a while ago: confirm with Google, retry.
    if (codeOf(error) !== "auth/requires-recent-login") {
      throw new SetPasswordError(codeOf(error));
    }

    try {
      await sdk.reauthenticate(user);
      await sdk.link(user, credential);
    } catch (retryError) {
      throw new SetPasswordError(codeOf(retryError));
    }
  }
}
