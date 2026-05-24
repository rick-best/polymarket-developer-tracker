import fs from "node:fs";
import path from "node:path";
import { buildOfficialEngagementPage } from "../scripts/buildOfficialEngagementPage.mjs";
import { buildMarketIntelPage } from "../scripts/buildMarketIntelPage.mjs";
import { buildProductPortfolioPage } from "../scripts/buildProductPortfolioPage.mjs";
import { buildSiteEvidence } from "../scripts/buildSiteEvidence.mjs";
import { runCommunityIntel } from "./communityIntel.mjs";
import { collectPolymarketSnapshot } from "./polymarketCollector.mjs";
import { buildDailyMessage, buildRunRecord, saveTextReport } from "./reportBuilder.mjs";
import { emailRuntime } from "./emailProvider.mjs";
import { ensureDir, loadJson, nowInShanghai, reportPath } from "./config.mjs";

const REPORTS_DIR = "reports";
const DATA_DIR = "data";
const SITE_EVIDENCE_DIR = path.join("site", "evidence");

const MANUAL_CONFIRMATION_ACTIONS = new Set([
  "trade",
  "order",
  "deposit",
  "withdraw",
  "wallet-signing",
  "wallet-connect",
  "approval",
  "api-key-create",
  "public-post",
  "account-change",
  "live-deploy",
  "live-email"
]);

function readText(relativePath) {
  try {
    return fs.readFileSync(relativePath, "utf8");
  } catch {
    return "";
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), { mode: 0o600 });
}

function missingEmailKeys(runtime) {
  return runtime.missingLiveConfig ?? runtime.missing ?? [];
}

function task(id, title, status, owner, nextAction, evidence = []) {
  return { id, title, status, owner, nextAction, evidence };
}

function assessBlockers({ state, runtime, projectStatus, queue }) {
  const blockers = [];
  const automaticActions = [];
  const manualActions = [];

  const builderStatus = state.builderProgram?.status ?? "";
  if (builderStatus === "submitted-unconfirmed") {
    blockers.push(
      task(
        "builder-program-confirmation",
        "Builder Program submitted but not officially confirmed",
        "monitor-only",
        "builder_program_monitor",
        "Check official email/in-site status and record only explicit acceptance, rejection, application ID, or no-change evidence.",
        ["data/execution-state.json", "reports/", "site/evidence/"]
      )
    );
    automaticActions.push("Refresh official read-only snapshot and keep submission status evidence current.");
  }

  const currentFocus = state.ecosystemProjects?.currentFocusStatus ?? "";
  const hostingStillPending =
    /hosting|publishing|draft/i.test(currentFocus) ||
    queue.includes("hosting choice") ||
    projectStatus.includes("hosting choice");
  if (hostingStillPending) {
    blockers.push(
      task(
        "public-site-hosting-choice",
        "Public Builder Profile Site needs a confirmed hosting target",
        "needs-user-choice",
        "deployment_ops_guard",
        "User chooses GitHub Pages, Cloudflare Pages, Netlify, Vercel, or existing Tencent server. Default recommendation remains no-server static hosting.",
        ["docs/public-builder-profile-site.md", "site/"]
      )
    );
    manualActions.push("Choose one static hosting target or explicitly choose Tencent server with preflight.");
  }

  if (state.serverDeployment?.status === "blocked-preflight-required" || queue.includes("Preflight required")) {
    blockers.push(
      task(
        "server-preflight-required",
        "Server deployment blocked until existing services are inspected",
        "needs-read-only-preflight",
        "deployment_ops_guard",
        "Run read-only preflight on the target server: hostname, pwd, processes, listening ports, running services, timers, and crontab.",
        ["docs/deployment.md", "automation/polymarket-blocker-agent.service.example"]
      )
    );
    manualActions.push("Approve/complete server preflight before enabling any server timer.");
  }

  const missingKeys = missingEmailKeys(runtime);
  if (missingKeys.length > 0) {
    blockers.push(
      task(
        "smtp-live-config",
        "Local SMTP live-send is not ready",
        "needs-env",
        "email_report_agent",
        `Set missing server environment keys without exposing values: ${missingKeys.join(", ")}.`,
        ["docs/deployment.md", "data/execution-state.json"]
      )
    );
    automaticActions.push("Keep report generation in dry-run mode and avoid live email send.");
  }

  blockers.push(
    task(
      "hard-stop-actions",
      "Trading, wallet, API-key, public-post, account-change, live deploy, and live email actions require explicit action-time confirmation",
      "hard-stop",
      "credential_trading_safety_reviewer",
      "Keep these actions out of autonomous runs. Emit them as manual confirmations only.",
      ["NEXT_ACTION_QUEUE.md", "AGENTS.md"]
    )
  );

  return {
    blockers,
    automaticActions,
    manualActions,
    hardStopActionTypes: [...MANUAL_CONFIRMATION_ACTIONS]
  };
}

function nextSafeAction(assessment) {
  if (assessment.automaticActions.length > 0) return assessment.automaticActions[0];
  return "Continue P2 read-only deliverables: Market Intelligence diff/export, Builder Tracker hardening, and evidence freshness.";
}

function renderTextReport({
  generatedAt,
  dailyReport,
  siteEvidence,
  marketIntel,
  communityIntel,
  productPortfolio,
  officialEngagement,
  assessment
}) {
  const lines = [
    "Polymarket Blocker Agent Report",
    "",
    `Generated at: ${generatedAt} Asia/Shanghai`,
    "",
    "Automatic actions completed:",
    `- Daily report dry-run refreshed: ${dailyReport.reportText}`,
    `- Daily report JSON refreshed: ${dailyReport.reportJson}`,
    `- Static evidence refreshed: latest=${siteEvidence.latest ?? "none"}`,
    `- Market Intel page refreshed: ${marketIntel.output}`,
    `- Community Intel refreshed: ${communityIntel.siteHtml}`,
    `- Product Portfolio refreshed: ${productPortfolio.output}`,
    `- Official Engagement queue refreshed: ${officialEngagement.output}`,
    "",
    "Current blockers:",
    ...assessment.blockers.map((item) => `- [${item.status}] ${item.title} -> ${item.nextAction}`),
    "",
    "Next safe action:",
    `- ${nextSafeAction(assessment)}`,
    "",
    "Hard stops:",
    "- No trading, order placement, deposits, withdrawals, wallet signing, wallet connection, approvals, new API key creation, public posts, account changes, live deployment, or live email without explicit action-time confirmation."
  ];

  return `${lines.join("\n")}\n`;
}

export async function runBlockerAgent() {
  const generatedAt = nowInShanghai();
  const projectStatus = readText("PROJECT_STATUS.md");
  const queue = readText("NEXT_ACTION_QUEUE.md");
  const state = loadJson("data/execution-state.json", {});

  const snapshot = await collectPolymarketSnapshot();
  const message = buildDailyMessage(snapshot);
  const date = snapshot.collectedAt.slice(0, 10);
  const reportText = reportPath(`daily-${date}.txt`);
  const reportJson = reportPath(`daily-${date}.json`);

  saveTextReport(reportText, message);
  const record = buildRunRecord({ mode: "blocker-agent-dry-run", snapshot, message, sendResult: null });
  writeJson(reportJson, record);

  const siteEvidence = buildSiteEvidence();
  const marketIntel = buildMarketIntelPage();
  const productPortfolio = buildProductPortfolioPage();
  const communityIntel = await runCommunityIntel();
  const officialEngagement = await buildOfficialEngagementPage();
  const runtime = emailRuntime();
  const assessment = assessBlockers({ state, runtime, projectStatus, queue });

  const output = {
    generatedAt,
    mode: "safe-local-blocker-agent",
    completed: {
      reportText,
      reportJson,
      siteEvidence,
      marketIntel,
      communityIntel,
      productPortfolio,
      officialEngagement
    },
    runtime,
    assessment,
    nextSafeAction: nextSafeAction(assessment)
  };

  const dateSlug = generatedAt.slice(0, 10);
  const jsonFile = path.join(REPORTS_DIR, `blocker-agent-${dateSlug}.json`);
  const textFile = path.join(REPORTS_DIR, `blocker-agent-${dateSlug}.txt`);
  const latestJson = path.join(DATA_DIR, "blocker-agent-latest.json");
  const latestSiteJson = path.join(SITE_EVIDENCE_DIR, "blocker-agent-latest.json");
  const latestSiteText = path.join(SITE_EVIDENCE_DIR, "blocker-agent-latest.txt");
  const text = renderTextReport({
    generatedAt,
    dailyReport: output.completed,
    siteEvidence,
    marketIntel,
    communityIntel,
    productPortfolio,
    officialEngagement,
    assessment
  });

  writeJson(jsonFile, output);
  writeJson(latestJson, output);
  ensureDir(REPORTS_DIR);
  fs.writeFileSync(textFile, text, { mode: 0o600 });
  ensureDir(SITE_EVIDENCE_DIR);
  fs.writeFileSync(latestSiteJson, JSON.stringify(output, null, 2), "utf8");
  fs.writeFileSync(latestSiteText, text, "utf8");

  return {
    ...output,
    reports: {
      jsonFile,
      textFile,
      latestJson,
      latestSiteJson,
      latestSiteText
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runBlockerAgent();
  console.log(JSON.stringify(result, null, 2));
}
