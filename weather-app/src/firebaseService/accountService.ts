import {
  confirmPasswordReset,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
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
 
// Google sign-in lives in authService.signInWithGoogle, which also creates
// the users/{uid} profile and refuses unregistered accounts on the Sign in tab.
export const accountService = createAccountActions({
  auth,
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