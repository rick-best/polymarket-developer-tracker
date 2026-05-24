import fs from "node:fs";
import { collectPolymarketSnapshot } from "./polymarketCollector.mjs";
import { sendEmail } from "./emailProvider.mjs";
import { buildDailyMessage, buildRunRecord, saveTextReport } from "./reportBuilder.mjs";
import { reportPath } from "./config.mjs";

const args = new Set(process.argv.slice(2));
const sendLive = args.has("--send-live");
const dryRun = args.has("--dry-run") || !sendLive;

const snapshot = await collectPolymarketSnapshot();
const message = buildDailyMessage(snapshot);
const date = snapshot.collectedAt.slice(0, 10);

saveTextReport(reportPath(`daily-${date}.txt`), message);

let sendResult = null;
let mode = "dry-run";

if (dryRun) {
  mode = "dry-run";
} else {
  if (!args.has("--confirm-live-send")) {
    throw new Error("Refusing live email without --confirm-live-send");
  }
  mode = "send-live";
  sendResult = await sendEmail(message);
}

const record = buildRunRecord({ mode, snapshot, message, sendResult });
fs.writeFileSync(reportPath(`daily-${date}.json`), JSON.stringify(record, null, 2), { mode: 0o600 });

console.log(JSON.stringify({
  mode,
  subject: message.subject,
  reportText: reportPath(`daily-${date}.txt`),
  reportJson: reportPath(`daily-${date}.json`),
  sendResult
}, null, 2));
