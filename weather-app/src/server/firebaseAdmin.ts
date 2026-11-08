import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function parseServiceAccount(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    // Do not include the parse error: it can quote part of the key.
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
}

// Uses FIREBASE_SERVICE_ACCOUNT (the key file's JSON as one line) when set,
// otherwise the file that GOOGLE_APPLICATION_CREDENTIALS points to.
export function createResetLinkGenerator(serviceAccountJson?: string) {
  if (getApps().length === 0) {
    initializeApp({
      credential: serviceAccountJson
        ? cert(parseServiceAccount(serviceAccountJson))
        : applicationDefault(),
    });
  }

  const auth = getAuth();

  return (email: string): Promise<string> =>
    auth.generatePasswordResetLink(email);
}
