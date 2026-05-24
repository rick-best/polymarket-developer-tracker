import { verifyEmailTransport } from "./emailProvider.mjs";

try {
  const result = await verifyEmailTransport();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    verified: false,
    error: error.message,
    code: error.code || null,
    command: error.command || null
  }, null, 2));
  process.exitCode = 1;
}
