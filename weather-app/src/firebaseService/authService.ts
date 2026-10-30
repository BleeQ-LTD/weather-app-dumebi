import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import type { User, Unsubscribe } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, authPersistenceReady, db } from "./firebase";
 
// An error with a Firebase-style code and a message that is safe to show to users.
export class AuthError extends Error {
  code: string;
 
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
 
const GENERIC_MESSAGE = "Something went wrong. Please try again.";
 
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/missing-email": "Email is required.",
  "auth/missing-password": "Password is required.",
  "auth/missing-first-name": "First name is required.",
  "auth/missing-last-name": "Last name is required.",
  "auth/invalid-name": "First and last names must be 50 characters or fewer.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  // Newer Firebase projects return this for both wrong password and unknown email.
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/operation-not-allowed": "Email/password sign-in isn't enabled for this app.",
  "auth/configuration-not-found": "Email/password sign-in isn't enabled for this app.",
  "auth/network-request-failed":
    "Unable to connect. Please check your internet connection.",
  "auth/popup-blocked":
    "Your browser blocked the Google sign-in popup. Allow popups and try again.",
  // Firestore errors have no "auth/" prefix.
  "permission-denied": "We couldn't save your profile. Please try again.",
  unavailable: "Unable to connect. Please check your internet connection.",
};
 
function getErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "unknown";
}
 
// Turns any error into a friendly message (never exposes raw Firebase text).
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  return AUTH_ERROR_MESSAGES[getErrorCode(error)] ?? GENERIC_MESSAGE;
}
 
function toAuthError(error: unknown): AuthError {
  return new AuthError(getErrorCode(error), getAuthErrorMessage(error));
}
 
function validateCredentials(email: string, password: string): void {
  if (!email.trim()) throw toAuthError({ code: "auth/missing-email" });
  if (!password) throw toAuthError({ code: "auth/missing-password" });
}
 
export async function signUp(
  firstName: string,
  lastName: string,
  gender: string,
  email: string,
  password: string
): Promise<User> {
  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const cleanGender = gender.trim();
  const cleanEmail = email.trim();
 
  if (!cleanFirstName) {
    throw new AuthError(
      "auth/missing-first-name",
      "First name is required."
    );
  }
 
  if (!cleanLastName) {
    throw new AuthError(
      "auth/missing-last-name",
      "Last name is required."
    );
  }
 
  if (!cleanGender) {
    throw new AuthError(
      "auth/missing-gender",
      "Please select your gender."
    );
  }
 
  if (cleanFirstName.length > 50 || cleanLastName.length > 50) {
    throw new AuthError(
      "auth/invalid-name",
      "First and last names must be 50 characters or fewer."
    );
  }
 
  validateCredentials(cleanEmail, password);
 
  try {
    await authPersistenceReady;
 
    const credential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
 
    const createdUser = credential.user;
 
    await setDoc(doc(db, "users", createdUser.uid), {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      gender: cleanGender,
      email: createdUser.email,
      createdAt: serverTimestamp(),
    });
 
    return createdUser;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw toAuthError(error);
  }
}
 
export async function signIn(email: string, password: string): Promise<User> {
  validateCredentials(email, password);
 
  try {
    await authPersistenceReady;
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}
 
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAuthError(error);
  }
}
 
type AuthCallback = (user: User | null) => void;
 
const authSubscribers = new Set<AuthCallback>();
 
// While a Google sign-in is being checked, auth changes are held back so the
// app never shows a half-finished login (for example an account that is about
// to be rejected, or a profile that has not been written yet).
let googleCheckInProgress = false;
 
export function subscribeToAuth(callback: AuthCallback): Unsubscribe {
  authSubscribers.add(callback);
 
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!googleCheckInProgress) callback(user);
  });
 
  return () => {
    authSubscribers.delete(callback);
    unsubscribe();
  };
}
 
function finishGoogleCheck(): void {
  googleCheckInProgress = false;
 
  // Tell the app where things ended up, now that the check is over.
  authSubscribers.forEach((callback) => callback(auth.currentUser));
}
 
function splitDisplayName(
  displayName: string | null,
  email: string | null
): {
  firstName: string;
  lastName: string;
} {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  // The rules need a non-empty first name, so fall back to the email prefix.
  const emailPrefix = (email ?? "").split("@")[0];
  return {
    firstName: (parts[0] || emailPrefix).slice(0, 50),
    lastName: parts.slice(1).join(" ").slice(0, 50),
  };
}
 
// Makes sure users/{uid} exists with real fields (name, email, createdAt).
// Safe to call on every sign-in: a complete profile is left untouched, and a
// missing or incomplete one is filled in without overwriting existing values.
export async function ensureUserProfile(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.exists() ? snapshot.data() : null;
 
  if (existing?.email && existing?.createdAt) return;
 
  const { firstName, lastName } = splitDisplayName(user.displayName, user.email);
 
  await setDoc(
    userRef,
    {
      firstName: existing?.firstName || firstName,
      lastName: existing?.lastName || lastName,
      email: existing?.email || user.email || "",
      createdAt: existing?.createdAt ?? serverTimestamp(),
    },
    { merge: true }
  );
}
 
export type GoogleAuthMode = "signIn" | "signUp";
 
// Writes the profile for an account that Google has just created.
// No read first, so it works even if the rules only allow the owner to create.
async function createGoogleUserProfile(user: User): Promise<void> {
  const { firstName, lastName } = splitDisplayName(user.displayName, user.email);
 
  await setDoc(doc(db, "users", user.uid), {
    firstName,
    lastName,
    email: user.email ?? "",
    createdAt: serverTimestamp(),
  });
}
 
// Removes an account that Google created a moment ago but that we are not keeping.
async function discardNewAccount(user: User): Promise<void> {
  try {
    await user.delete();
  } catch (deleteError) {
    console.error(
      "Could not remove new Google account, code:",
      getErrorCode(deleteError),
      deleteError
    );
  }
}
 
// "signIn" only lets in people who already have an account.
// "signUp" creates the account (and its users/{uid} document) when it is new.
export async function signInWithGoogle(
  mode: GoogleAuthMode = "signUp"
): Promise<User> {
  googleCheckInProgress = true;
 
  try {
    await authPersistenceReady;
 
    const provider = new GoogleAuthProvider();
 
    // Request the Google account chooser every time.
    provider.setCustomParameters({
      prompt: "select_account",
    });
 
    // Clear the currently signed-in Firebase user first.
    if (auth.currentUser) {
      await signOut(auth);
    }
 
    // Start a fresh Google sign-in flow.
    const credential = await signInWithPopup(auth, provider);
    const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false;
 
    if (isNewUser && mode === "signIn") {
      // Firebase creates the account on first Google sign-in, so undo it.
      await discardNewAccount(credential.user);
 
      throw new AuthError(
        "auth/account-not-found",
        "No account found for this Google account. Please sign up first."
      );
    }
 
    if (isNewUser) {
      try {
        await createGoogleUserProfile(credential.user);
      } catch (profileError) {
        // Do not leave an account behind that has no profile.
        await discardNewAccount(credential.user);
        throw profileError;
      }
    } else {
      // Existing account: fill in a missing or incomplete profile.
      await ensureUserProfile(credential.user);
    }
 
    return credential.user;
  } catch (error) {
    // Whatever went wrong, do not leave the person half signed in.
    try {
      if (auth.currentUser) await signOut(auth);
    } catch {
      // ignore: the error below is the one worth reporting
    }
 
    if (error instanceof AuthError) throw error;
    console.error("Google sign-in failed, code:", getErrorCode(error), error);
    throw toAuthError(error);
  } finally {
    finishGoogleCheck();
  }
}
 
export async function sendPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim();
 
  if (!normalizedEmail) {
    throw new AuthError(
      "auth/missing-email",
      "Please enter your email address."
    );
  }
 
  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error) {
    // Do not reveal whether an account exists for this email.
    if (getErrorCode(error) === "auth/user-not-found") return;
 
    console.error("Password reset failed, code:", getErrorCode(error), error);
    throw toAuthError(error);
  }
}

