import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createResetLinkGenerator } from "./firebaseAdmin.js";
import { createSendByteMailer } from "./sendbyte.js";

const config = loadConfig();

const app = createApp({
  appOrigin: config.appOrigin,
  generateLink: createResetLinkGenerator(config.firebaseServiceAccount),
  sendMail: createSendByteMailer({
    apiKey: config.sendbyteApiKey,
    from: config.mailFrom,
    baseUrl: config.sendbyteBaseUrl,
  }),
});

const server = app.listen(config.port, () => {
  console.log(`Backend running at http://localhost:${config.port}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
