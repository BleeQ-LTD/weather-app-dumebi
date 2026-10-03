import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User, Unsubscribe } from "firebase/auth";
import { auth } from "./firebase";

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
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
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

export function getAuthErrorMessage(error: unknown): string {
  return AUTH_ERROR_MESSAGES[getErrorCode(error)] ?? GENERIC_MESSAGE;
}

function toAuthError(error: unknown): AuthError {
  return new AuthError(getErrorCode(error), getAuthErrorMessage(error));
}

function validateCredentials(email: string, password: string): void {
  if (!email.trim()) throw toAuthError({ code: "auth/missing-email" });
  if (!password) throw toAuthError({ code: "auth/missing-password" });
}

export async function signUp(email: string, password: string): Promise<User> {
  validateCredentials(email, password);

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  validateCredentials(email, password);

  try {
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

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
