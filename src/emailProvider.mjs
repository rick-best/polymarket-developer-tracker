import nodemailer from "nodemailer";
import { env, loadedEnvFiles } from "./config.mjs";

export function emailConfig() {
  const provider = env("ALERT_PROVIDER", "smtp-email");
  const portValue = env("EMAIL_SMTP_PORT");

  return {
    provider,
    providerChain: env("ALERT_PROVIDER_CHAIN", provider),
    to: splitRecipients(env("ALERT_EMAIL_TO")),
    from: env("EMAIL_FROM"),
    fromName: env("EMAIL_FROM_NAME", "Polymarket Developer Tracker"),
    host: env("EMAIL_SMTP_HOST"),
    port: portValue ? Number(portValue) : NaN,
    secure: env("EMAIL_SMTP_SECURE", "false") === "true",
    user: env("EMAIL_SMTP_USER", env("EMAIL_FROM")),
    pass: env("EMAIL_SMTP_PASS", ""),
    timeoutMs: positiveNumber(env("PROVIDER_ACCEPT_TIMEOUT_MS"), 30000),
    sendAttempts: positiveInteger(env("EMAIL_SEND_ATTEMPTS"), 3),
    retryDelayMs: positiveNumber(env("EMAIL_RETRY_DELAY_MS"), 5000)
  };
}

export function emailRuntime() {
  const config = emailConfig();
  const missingLiveConfig = [];

  if (!config.to.length) missingLiveConfig.push("ALERT_EMAIL_TO");
  if (!config.from) missingLiveConfig.push("EMAIL_FROM");
  if (!config.host) missingLiveConfig.push("EMAIL_SMTP_HOST");
  if (!Number.isFinite(config.port) || config.port <= 0) missingLiveConfig.push("EMAIL_SMTP_PORT");
  if (!config.user) missingLiveConfig.push("EMAIL_SMTP_USER");
  if (!config.pass || isPlaceholderSecret(config.pass)) missingLiveConfig.push("EMAIL_SMTP_PASS");
  if (config.provider !== "smtp-email") missingLiveConfig.push("ALERT_PROVIDER=smtp-email");

  const liveReady = missingLiveConfig.length === 0;

  return {
    provider: config.provider,
    providerChain: config.providerChain,
    liveReady,
    emailReady: liveReady,
    maskedRecipient: config.to.map(maskEmail).join(", "),
    missingLiveConfig,
    loadedEnvFiles
  };
}

export async function sendEmail({ subject, text }) {
  const config = emailConfig();
  const runtime = emailRuntime();
  if (!runtime.liveReady) {
    throw new Error(`Missing live email config: ${runtime.missingLiveConfig.join(", ")}`);
  }
  if (config.provider !== "smtp-email") {
    throw new Error(`Unsupported email provider: ${config.provider}`);
  }

  const result = await withEmailRetry(
    () => createSmtpTransport(config).sendMail({
      from: formatAddress(config.fromName, config.from),
      to: config.to,
      subject,
      text
    }),
    config
  );

  return {
    provider: "smtp-email",
    acceptedCount: result.accepted?.length || 0,
    rejectedCount: result.rejected?.length || 0,
    response: result.response || "",
    messageId: result.messageId || "",
    attempts: result.attempts,
    maskedRecipient: config.to.map(maskEmail).join(", ")
  };
}

export async function verifyEmailTransport() {
  const config = emailConfig();
  const runtime = emailRuntime();
  if (!runtime.liveReady) {
    throw new Error(`Missing live email config: ${runtime.missingLiveConfig.join(", ")}`);
  }

  const transport = createSmtpTransport(config);
  await transport.verify();
  return {
    provider: "smtp-email",
    verified: true,
    host: config.host,
    port: config.port,
    secure: config.secure,
    timeoutMs: config.timeoutMs,
    maskedRecipient: config.to.map(maskEmail).join(", ")
  };
}

function createSmtpTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs
  });
}

async function withEmailRetry(operation, config) {
  let lastError;
  for (let attempt = 1; attempt <= config.sendAttempts; attempt += 1) {
    try {
      const result = await operation();
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= config.sendAttempts) break;
      await sleep(config.retryDelayMs * attempt);
    }
  }
  throw lastError;
}

export function splitRecipients(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function maskEmail(email) {
  if (!email || !email.includes("@")) return "";
  const [name, domain] = email.split("@");
  const visible = name.slice(0, Math.min(3, name.length));
  return `${visible}***@${domain}`;
}

function formatAddress(name, email) {
  if (!name) return email;
  const safeName = String(name).replaceAll('"', "'");
  return `"${safeName}" <${email}>`;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveInteger(value, fallback) {
  return Math.max(1, Math.floor(positiveNumber(value, fallback)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlaceholderSecret(value) {
  return String(value).toLowerCase().includes("replace-with");
}
