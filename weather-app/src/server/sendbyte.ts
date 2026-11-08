import type { MailMessage } from "./passwordReset.js";

interface SendByteOptions {
  apiKey: string;
  from: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };

    if (typeof body.error?.message === "string") return body.error.message;
  } catch {
    // The body was not JSON; fall back to the status text below.
  }

  return response.statusText || "no details";
}

// POST /v1/emails on SendByte. A key starting with sk_test_ only simulates the
// send (nothing is delivered); a live key and a verified sender domain are
// needed for real delivery.
export function createSendByteMailer({
  apiKey,
  from,
  baseUrl = "https://api.sendbyte.africa",
  fetchFn = fetch,
}: SendByteOptions) {
  return async function sendMail(message: MailMessage): Promise<void> {
    const response = await fetchFn(`${baseUrl}/v1/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await readErrorMessage(response);
      throw new Error(`SendByte rejected the email (${response.status}): ${detail}`);
    }
  };
}
