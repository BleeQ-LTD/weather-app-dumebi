type Env = Record<string, string | undefined>;

export interface ServerConfig {
  port: number;
  appOrigin: string;
  sendbyteApiKey: string;
  sendbyteBaseUrl: string | undefined;
  mailFrom: string;
  firebaseServiceAccount: string | undefined;
}

const REQUIRED = ["SENDBYTE_API_KEY", "MAIL_FROM", "APP_ORIGIN"];

// Reads and checks the environment once, at startup. Error messages name the
// variables but never print their values.
export function loadConfig(env: Env = process.env): ServerConfig {
  const missing = REQUIRED.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  const port = Number(env.PORT ?? 3000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a whole number above 0.");
  }

  let appOrigin: string;

  try {
    appOrigin = new URL(env.APP_ORIGIN ?? "").origin;
  } catch {
    throw new Error(
      "APP_ORIGIN must be a full address such as http://localhost:5174."
    );
  }

  return {
    port,
    appOrigin,
    sendbyteApiKey: env.SENDBYTE_API_KEY ?? "",
    sendbyteBaseUrl: env.SENDBYTE_BASE_URL || undefined,
    mailFrom: env.MAIL_FROM ?? "",
    firebaseServiceAccount: env.FIREBASE_SERVICE_ACCOUNT || undefined,
  };
}
