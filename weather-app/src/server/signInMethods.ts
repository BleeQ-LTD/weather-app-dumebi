import { isValidEmail } from "./passwordReset.js";

// Looks up an account's sign-in providers ("google.com", "password", ...).
// Resolves null when there is no account for the email.
export type ProviderLookup = (email: string) => Promise<string[] | null>;

// True only for an existing account that signs in with Google and has no
// password, i.e. the person who just failed an email + password sign-in
// should be told to use Google (and can then set a password in their profile).
export async function isGoogleOnlyAccount(
  email: string,
  lookup: ProviderLookup
): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!isValidEmail(clean)) return false;

  const providers = await lookup(clean);
  if (!providers) return false;

  return providers.includes("google.com") && !providers.includes("password");
}
