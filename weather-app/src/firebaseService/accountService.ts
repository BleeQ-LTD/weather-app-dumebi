import {
  confirmPasswordReset,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  verifyPasswordResetCode,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebase";
import { createAccountActions } from "./accountActions";
import type { GoogleSignInResult } from "./accountActions";

async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    return {
      ok: true,
      user: result.user,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Google sign-in failed.",
    };
  }
}


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

export const accountService = createAccountActions({
  auth,
  signInWithGoogle,
  sdk: {
    confirmPasswordReset,
    isSignInWithEmailLink,
    sendEmailVerification,
    sendPasswordResetEmail,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    verifyPasswordResetCode,
  },
  getOrigin: () => window.location.origin,
  storage: safeStorage,
});
