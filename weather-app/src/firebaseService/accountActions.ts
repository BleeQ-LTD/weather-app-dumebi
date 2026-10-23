
import type {
  ActionCodeSettings,
  Auth,
  User,
  UserCredential,
} from "firebase/auth";

export type GoogleSignInResult =
  | { ok: true; user: User }
  | { ok: false; message: string };

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type EmailLinkResult =
  | { status: "not-a-link" }
  | { status: "needs-email" }
  | { status: "signed-in" }
  | { status: "error"; message: string };

export type ResetCodeResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

// Firebase functions used by this file.
// Passing them in keeps the logic testable without Firebase.
export interface AccountSdk {
  sendPasswordResetEmail(
    auth: Auth,
    email: string,
    settings?: ActionCodeSettings | null
  ): Promise<void>;

  verifyPasswordResetCode(auth: Auth, code: string): Promise<string>;

  confirmPasswordReset(
    auth: Auth,
    code: string,
    newPassword: string
  ): Promise<void>;

  sendSignInLinkToEmail(
    auth: Auth,
    email: string,
    settings: ActionCodeSettings
  ): Promise<void>;

  isSignInWithEmailLink(auth: Auth, link: string): boolean;

  signInWithEmailLink(
    auth: Auth,
    email: string,
    link?: string
  ): Promise<UserCredential>;

  sendEmailVerification(
    user: User,
    settings?: ActionCodeSettings | null
  ): Promise<void>;
}

export interface AccountDeps {
  signInWithGoogle?: () => Promise<GoogleSignInResult>;
  auth: Auth;
  sdk: AccountSdk;
  getOrigin: () => string;
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
}

export const EMAIL_FOR_SIGN_IN_KEY = "emailForSignIn";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const RESET_SENT =
  "If an account exists for that address, we have sent a link to reset the password.";

const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed":
    "Network problem. Check your connection and try again.",
  "auth/expired-action-code":
    "This link has expired. Request a new one.",
  "auth/invalid-action-code":
    "This link is invalid or has already been used. Request a new one.",
  "auth/weak-password":
    "Choose a stronger password (at least 8 characters).",
  "auth/operation-not-allowed":
    "This sign-in method is turned off in the Firebase console.",
  "auth/unauthorized-continue-uri":
    "This site is not an authorised domain yet. Add it in Firebase Authentication settings.",
  "auth/invalid-continue-uri":
    "The return address for this email is not valid.",
  "auth/popup-closed-by-user":
    "Google sign-in was cancelled. Please try again.",
  "auth/popup-blocked":
    "Your browser blocked the Google sign-in popup. Allow popups and try again.",
  "auth/cancelled-popup-request":
    "Another sign-in popup is already open.",
};

export function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string") return code;
  }

  return "";
}

export function authErrorMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export function validateNewPassword(
  password: string,
  confirm: string
): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password !== confirm) {
    return "The two passwords do not match.";
  }

  return "";
}

export function createAccountActions({
  auth,
  sdk,
  getOrigin,
  storage,
  signInWithGoogle,
}: AccountDeps) {
  const continueUrl = () => `${getOrigin()}/`;

  return {
    // Sign in with Google
    async signInWithGoogle(): Promise<GoogleSignInResult> {
      if (!signInWithGoogle) {
        return {
          ok: false,
          message: "Google sign-in is not configured.",
        };
      }

      try {
        return await signInWithGoogle();
      } catch (err) {
        return {
          ok: false,
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },

    // Forgot password
    async requestPasswordReset(rawEmail: string): Promise<ActionResult> {
      const email = rawEmail.trim();

      if (!EMAIL_PATTERN.test(email)) {
        return {
          ok: false,
          message: authErrorMessage("auth/invalid-email"),
        };
      }

      try {
        await sdk.sendPasswordResetEmail(auth, email, {
          url: continueUrl(),
        });
      } catch (err) {
        const code = authErrorCode(err);

        if (code !== "auth/user-not-found") {
          return {
            ok: false,
            message: authErrorMessage(code),
          };
        }
      }

      return { ok: true, message: RESET_SENT };
    },

    // Passwordless sign-in: send an email link
    async sendSignInLink(rawEmail: string): Promise<ActionResult> {
      const email = rawEmail.trim();

      if (!EMAIL_PATTERN.test(email)) {
        return {
          ok: false,
          message: authErrorMessage("auth/invalid-email"),
        };
      }

      try {
        await sdk.sendSignInLinkToEmail(auth, email, {
          url: continueUrl(),
          handleCodeInApp: true,
        });

        storage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);

        return {
          ok: true,
          message: `We sent a sign-in link to ${email}. Open it on this device to finish signing in.`,
        };
      } catch (err) {
        return {
          ok: false,
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },

    isEmailLink(href: string): boolean {
      return sdk.isSignInWithEmailLink(auth, href);
    },

    // Finish sign-in when the user opens the emailed link
    async completeSignInWithLink(
      href: string,
      typedEmail?: string
    ): Promise<EmailLinkResult> {
      if (!sdk.isSignInWithEmailLink(auth, href)) {
        return { status: "not-a-link" };
      }

      const email = (
        typedEmail ??
        storage.getItem(EMAIL_FOR_SIGN_IN_KEY) ??
        ""
      ).trim();

      if (email === "") {
        return { status: "needs-email" };
      }

      if (!EMAIL_PATTERN.test(email)) {
        return {
          status: "error",
          message: authErrorMessage("auth/invalid-email"),
        };
      }

      try {
        await sdk.signInWithEmailLink(auth, email, href);
        storage.removeItem(EMAIL_FOR_SIGN_IN_KEY);

        return { status: "signed-in" };
      } catch (err) {
        return {
          status: "error",
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },

    async resendVerification(user: User): Promise<ActionResult> {
      try {
        await sdk.sendEmailVerification(user, {
          url: continueUrl(),
        });

        return {
          ok: true,
          message: `Verification email sent to ${user.email ?? "your address"}.`,
        };
      } catch (err) {
        return {
          ok: false,
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },

    // Check the password-reset code
    async checkResetCode(code: string): Promise<ResetCodeResult> {
      try {
        return {
          ok: true,
          email: await sdk.verifyPasswordResetCode(auth, code),
        };
      } catch (err) {
        return {
          ok: false,
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },

    // Set the new password
    async finishPasswordReset(
      code: string,
      password: string,
      confirm: string
    ): Promise<ActionResult> {
      const problem = validateNewPassword(password, confirm);

      if (problem !== "") {
        return { ok: false, message: problem };
      }

      try {
        await sdk.confirmPasswordReset(auth, code, password);

        return {
          ok: true,
          message: "Password updated. You can now sign in with the new password.",
        };
      } catch (err) {
        return {
          ok: false,
          message: authErrorMessage(authErrorCode(err)),
        };
      }
    },
  };
}

export type AccountActions = ReturnType<typeof createAccountActions>;
