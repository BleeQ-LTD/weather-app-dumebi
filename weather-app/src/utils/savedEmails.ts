
const STORAGE_KEY = "weather-app-saved-emails";
const MAX_SAVED_EMAILS = 5;

export function getSavedEmails(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (email): email is string => typeof email === "string"
    );
  } catch {
    return [];
  }
}

export function saveEmail(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return;

  const emails = getSavedEmails().filter(
    (savedEmail) =>
      savedEmail.toLowerCase() !== normalizedEmail
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      [normalizedEmail, ...emails].slice(0, MAX_SAVED_EMAILS)
    )
  );
}

export function removeSavedEmail(email: string): void {
  const emails = getSavedEmails().filter(
    (savedEmail) =>
      savedEmail.toLowerCase() !== email.toLowerCase()
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}
