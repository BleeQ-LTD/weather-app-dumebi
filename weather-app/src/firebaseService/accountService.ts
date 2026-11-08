import {
  confirmPasswordReset,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "./firebase";
import { createAccountActions } from "./accountActions";

// localStorage can throw (private windows, blocked storage). Treat that as "nothing stored".
const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore: the user will be asked for their email instead
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Asks our own server (src/server) to email the reset link, so the link opens
// our reset page. The error codes are the ones accountActions turns into messages.
async function requestPasswordResetEmail(email: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch("/api/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw Object.assign(new Error("Network error"), {
      code: "auth/network-request-failed",
    });
  }

  if (response.status === 429) {
    throw Object.assign(new Error("Too many requests"), {
      code: "auth/too-many-requests",
    });
  }

  if (response.status === 400) {
    throw Object.assign(new Error("Invalid email"), {
      code: "auth/invalid-email",
    });
  }

  if (!response.ok) {
    throw new Error("Password reset request failed");
  }
}

// Google sign-in lives in authService.signInWithGoogle, which also creates
// the users/{uid} profile and refuses unregistered accounts on the Sign in tab.
export const accountService = createAccountActions({
  auth,
  sdk: {
    requestPasswordReset: requestPasswordResetEmail,
    confirmPasswordReset,
    isSignInWithEmailLink,
    sendEmailVerification,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    verifyPasswordResetCode,
  },
  getOrigin: () => window.location.origin,
  storage: safeStorage,
});
