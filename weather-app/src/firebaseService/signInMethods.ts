// After a failed email + password sign-in: asks our server whether this email
// belongs to an account that only signs in with Google. Any failure (offline,
// server not deployed, rate limit) simply means "don't show the tip".
export async function isGoogleOnlyAccount(email: string): Promise<boolean> {
  try {
    const response = await fetch("/api/sign-in-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) return false;

    const data: unknown = await response.json();
    return (
      typeof data === "object" &&
      data !== null &&
      (data as { googleOnly?: unknown }).googleOnly === true
    );
  } catch {
    return false;
  }
}
