import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
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

export function subscribeToAuth(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

async function ensureGoogleUserProfile(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    await setDoc(userRef, {
      firstName: user.displayName?.trim().split(/\s+/)[0] ?? "",
      lastName:
        user.displayName?.trim().split(/\s+/).slice(1).join(" ") ?? "",
      email: user.email,
      createdAt: serverTimestamp(),
    });
  }
}


export async function signInWithGoogle(): Promise<User> {
  await authPersistenceReady;

  const provider = new GoogleAuthProvider();

  // Request the Google account chooser every time.
  provider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    // Clear the currently signed-in Firebase user first.
    if (auth.currentUser) {
      await signOut(auth);
    }

    // Start a fresh Google sign-in flow.
    const credential = await signInWithPopup(auth, provider);

    await ensureGoogleUserProfile(credential.user);

    return credential.user;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw toAuthError(error);
  }
}
