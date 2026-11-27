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
function adminAuth(serviceAccountJson?: string) {
  if (getApps().length === 0) {
    initializeApp({
      credential: serviceAccountJson
        ? cert(parseServiceAccount(serviceAccountJson))
        : applicationDefault(),
    });
  }

  return getAuth();
}

export function createResetLinkGenerator(serviceAccountJson?: string) {
  const auth = adminAuth(serviceAccountJson);

  return (email: string): Promise<string> =>
    auth.generatePasswordResetLink(email);
}

// The account's sign-in providers, or null when no account uses this email.
export function createProviderLookup(serviceAccountJson?: string) {
  const auth = adminAuth(serviceAccountJson);

  return async (email: string): Promise<string[] | null> => {
    try {
      const user = await auth.getUserByEmail(email);
      return user.providerData.map((provider) => provider.providerId);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") return null;
      throw error;
    }
  };
}
