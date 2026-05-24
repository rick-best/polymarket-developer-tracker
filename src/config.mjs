import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export const ROOT = process.cwd();
export const DEFAULT_ENV_FILE = "/etc/polymarket-developer-tracker.env";
export const loadedEnvFiles = loadEnvFiles();

function loadEnvFiles() {
  const initialEnvKeys = new Set(Object.keys(process.env));
  const candidates = [
    path.join(ROOT, ".env"),
    DEFAULT_ENV_FILE,
    process.env.EMAIL_ENV_FILE,
    process.env.POLYMARKET_ENV_FILE
  ].filter(Boolean);
  const loaded = [];
  const seen = new Set();

  for (const filePath of candidates) {
    if (seen.has(filePath) || !fs.existsSync(filePath)) continue;
    let parsed;
    try {
      parsed = dotenv.parse(fs.readFileSync(filePath));
    } catch {
      seen.add(filePath);
      continue;
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (initialEnvKeys.has(key)) continue;
      process.env[key] = value;
    }
    loaded.push(filePath);
    seen.add(filePath);
  }

  return loaded;
}

export function env(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function reportPath(fileName) {
  const dir = path.join(ROOT, "reports");
  ensureDir(dir);
  return path.join(dir, fileName);
}

export function loadJson(relativePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

export function nowInShanghai() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: env("REPORT_EMAIL_TIMEZONE", "Asia/Shanghai"),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}
