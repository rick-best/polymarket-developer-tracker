import fs from "node:fs";
import path from "node:path";
import { ensureDir, loadJson, nowInShanghai, reportPath } from "./config.mjs";

const REPORT_DATE = nowInShanghai().slice(0, 10);
const OUTPUT_SITE_DIR = path.join("site", "community-intel");
const LATEST_JSON = path.join(OUTPUT_SITE_DIR, "community-intel-latest.json");
const LATEST_HTML = path.join(OUTPUT_SITE_DIR, "index.html");
const OBSERVATIONS_PATH = "data/community-intel-observations.json";
const DOCS_INDEX_URL = "https://docs.polymarket.com/llms.txt";
const GITHUB_ORG_REPOS_URL = "https://api.github.com/orgs/Polymarket/repos?per_page=100&sort=pushed";

const CHANNELS = [
  {
    name: "Official Docs",
    url: "https://docs.polymarket.com/",
    access: "public",
    safeUse: "fetch-and-parse"
  },
  {
    name: "Official GitHub",
    url: "https://github.com/Polymarket",
    access: "public",
    safeUse: "metadata-only"
  },
  {
    name: "Official X",
    url: "https://x.com/Polymarket",
    access: "connector-or-browser",
    safeUse: "read-only; verify links through official domains before use"
  },
  {
    name: "Builders X",
    url: "https://x.com/PolymarketBuild",
    access: "connector-or-browser",
    safeUse: "read-only; treat as official only while linked from official source record"
  },
  {
    name: "Official Discord",
    url: "https://discord.gg/polymarket",
    access: "login-required",
    safeUse: "read-only unless user confirms posting or account action"
  },
  {
    name: "Official Telegram",
    url: "https://t.me/polymarket",
    access: "app-or-browser-required",
    safeUse: "read-only; do not join bots or click third-party crypto links without verification"
  }
];

const WORKSTREAM_RULES = [
  {
    id: "api-examples-kit",
    title: "API Examples Kit",
    needles: ["api", "clob", "sdk", "endpoint", "openapi", "gateway", "pagination", "websocket", "data api", "gamma"],
    action:
      "Build read-only examples and compatibility checks around Gamma/Data/CLOB docs, with dry-run defaults and no embedded keys."
  },
  {
    id: "builder-profile-site",
    title: "Public Builder Profile Site",
    needles: ["builder", "leaderboard", "builder code", "builder api", "volume tracking", "profile"],
    action:
      "Keep the public Builder profile site deploy-ready and add evidence that explains the project, safety boundaries, and API value."
  },
  {
    id: "market-intel-dashboard",
    title: "Market Intelligence Dashboard",
    needles: ["market", "liquidity", "spread", "rewards", "volume", "new polymarket", "real-time"],
    action:
      "Convert official market/reward signals into read-only dashboard deltas, notable changes, and staleness flags."
  },
  {
    id: "community-support",
    title: "Community Support Desk",
    needles: ["discord", "telegram", "forum", "community", "feedback", "docs", "support"],
    action:
      "Prepare issue triage notes and safe response drafts for developer questions; posting requires user confirmation."
  },
  {
    id: "risk-compliance-monitor",
    title: "Risk & Compliance Monitor",
    needles: ["scam", "drained", "fake", "key", "wallet", "auth", "approval", "security", "wash"],
    action:
      "Track developer safety risks and unverified links with careful wording, without accusations or account actions."
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "polymarket-community-intel/0.1" }
    });
    return { ok: response.ok, status: response.status, url: response.url, text: await response.text(), error: "" };
  } catch (error) {
    return { ok: false, status: 0, url, text: "", error: error?.message || String(error) };
  }
}

async function fetchJson(url) {
  const result = await fetchText(url);
  if (!result.ok) return { ...result, data: null };
  try {
    return { ...result, data: JSON.parse(result.text) };
  } catch (error) {
    return { ...result, ok: false, data: null, error: error?.message || String(error) };
  }
}

function loadObservations() {
  const data = loadJson(OBSERVATIONS_PATH, { observations: [] });
  return Array.isArray(data.observations) ? data.observations : [];
}

function extractRelevantDocs(llmsText) {
  const lines = String(llmsText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const relevant = [];
  const seen = new Set();
  const docNeedles = [
    "api",
    "builder",
    "quickstart",
    "clob",
    "gamma",
    "data",
    "websocket",
    "rate limit",
    "error",
    "client",
    "sdk",
    "auth"
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!docNeedles.some((needle) => lower.includes(needle))) continue;
    const url = line.match(/https:\/\/docs\.polymarket\.com\/[^\s)]+/u)?.[0] || "";
    if (url.includes("/bridge/")) continue;
    const title = line
      .replace(/^\s*[-*]\s*/u, "")
      .replace(/\[|\]/gu, "")
      .replace(/\(https:\/\/docs\.polymarket\.com\/[^\s)]+\)/u, "")
      .trim();
    const key = url || title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    relevant.push({ title: title || url, url });
    if (relevant.length >= 24) break;
  }

  return relevant;
}

function summarizeRepos(repos) {
  if (!Array.isArray(repos)) return [];
  return repos
    .filter((repo) => repo?.name)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      htmlUrl: repo.html_url || "",
      pushedAt: repo.pushed_at || "",
      stars: repo.stargazers_count ?? null,
      forks: repo.forks_count ?? null,
      openIssues: repo.open_issues_count ?? null,
      archived: !!repo.archived
    }))
    .sort((a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)))
    .slice(0, 12);
}

function scoreWorkstreams({ observations, docs, repos }) {
  const corpus = [
    ...observations.map((item) => [item.title, item.summary, item.tags?.join(" ")].filter(Boolean).join(" ")),
    ...docs.map((item) => [item.title, item.url].filter(Boolean).join(" ")),
    ...repos.map((item) => [item.name, item.description].filter(Boolean).join(" "))
  ].join("\n").toLowerCase();

  return WORKSTREAM_RULES.map((rule) => {
    const matches = rule.needles.filter((needle) => corpus.includes(needle));
    const evidence = observations
      .filter((item) => {
        const text = [item.title, item.summary, item.tags?.join(" ")].filter(Boolean).join(" ").toLowerCase();
        return rule.needles.some((needle) => text.includes(needle));
      })
      .map((item) => ({
        source: item.source || "",
        title: item.title || "",
        confidence: item.confidence || "unknown",
        url: item.url || ""
      }))
      .slice(0, 5);

    return {
      id: rule.id,
      title: rule.title,
      score: matches.length + evidence.length,
      matchedTerms: matches,
      recommendedAction: rule.action,
      evidence
    };
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function buildBlockers() {
  return [
    {
      channel: "X continuous search",
      blocker: process.env.TWITTER_TOKEN ? "" : "TWITTER_TOKEN is not available locally; current run uses connector results and saved summaries only.",
      next: "Use X connector/browser or configure a token before automated X search."
    },
    {
      channel: "Discord developer community",
      blocker: "Login and posting are account actions.",
      next: "Open official Discord read-only; ask user before posting, joining restricted channels, or submitting forms."
    },
    {
      channel: "Telegram community",
      blocker: "Telegram bot/channel interactions can include unsafe crypto links.",
      next: "Read official @polymarket only; verify any outbound link through official X/website before use."
    },
    {
      channel: "Deployment",
      blocker: "Live server changes require fresh process/port/service preflight.",
      next: "Keep local site/report work moving until deployment target is explicitly confirmed."
    }
  ];
}

function renderTextReport(record) {
  const lines = [
    `Polymarket Community Intel / ${record.generatedAt} Asia/Shanghai`,
    "",
    "Scope",
    "- Read-only developer/community intelligence for Polymarket.",
    "- No trading, wallet signing, public posts, account changes, live email, or deployment actions.",
    "",
    "Channels",
    ...record.channels.map((item) => `- ${item.name}: ${item.access} | ${item.url}`),
    "",
    "Official Docs",
    `- docs index: ${record.officialDocs.ok ? "OK" : "FAILED"} HTTP ${record.officialDocs.status}`,
    ...record.officialDocs.relevant.slice(0, 10).map((item) => `- ${item.title}${item.url ? ` | ${item.url}` : ""}`),
    "",
    "Official GitHub",
    `- org repos: ${record.github.ok ? "OK" : "FAILED"} HTTP ${record.github.status}`,
    ...record.github.recentRepos.slice(0, 8).map((repo) => `- ${repo.name}: stars=${repo.stars ?? "?"}, pushedAt=${repo.pushedAt || "?"}`),
    "",
    "Priority Workstreams",
    ...record.workstreams
      .filter((item) => item.score > 0)
      .slice(0, 6)
      .map((item) => `- ${item.title}: score=${item.score}; ${item.recommendedAction}`),
    "",
    "Community/X Observations",
    ...record.observations.slice(0, 12).map((item) => `- [${item.confidence || "unknown"}] ${item.title}: ${item.summary}`),
    "",
    "Blockers",
    ...record.blockers.filter((item) => item.blocker).map((item) => `- ${item.channel}: ${item.blocker} Next: ${item.next}`)
  ];

  return `${lines.join("\n")}\n`;
}

function renderHtml(record) {
  const rows = record.workstreams
    .filter((item) => item.score > 0)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.score)}</td>
        <td>${escapeHtml(item.matchedTerms.join(", ") || "observed")}</td>
        <td>${escapeHtml(item.recommendedAction)}</td>
      </tr>`
    )
    .join("");

  const observationItems = record.observations
    .map(
      (item) => `<li>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="muted">[${escapeHtml(item.source || "unknown")} / ${escapeHtml(item.confidence || "unknown")}]</span><br />
        ${escapeHtml(item.summary || "")}
        ${item.url ? `<br /><a href="${escapeHtml(item.url)}" rel="noreferrer">${escapeHtml(item.url)}</a>` : ""}
      </li>`
    )
    .join("");

  const repoRows = record.github.recentRepos
    .slice(0, 10)
    .map(
      (repo) => `<tr>
        <td><a href="${escapeHtml(repo.htmlUrl)}" rel="noreferrer">${escapeHtml(repo.name)}</a></td>
        <td>${escapeHtml(repo.stars ?? "")}</td>
        <td>${escapeHtml(repo.openIssues ?? "")}</td>
        <td>${escapeHtml(repo.pushedAt || "")}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Community Intel — Polymarket Developer Tracker</title>
    <link rel="stylesheet" href="../styles.css" />
    <style>
      .page { max-width: 1040px; }
      .muted { color: rgba(236,245,255,0.72); }
      .toolbar { display:flex; gap:12px; flex-wrap:wrap; margin: 18px 0 28px; }
      .toolbar a { display:inline-block; padding:10px 12px; border-radius: 12px; border: 1px solid rgba(124,183,255,0.25); background: rgba(9,15,27,0.6); color: #eef5ff; text-decoration:none; }
      .table { width: 100%; border-collapse: collapse; margin: 18px 0 28px; }
      .table th, .table td { border-bottom: 1px solid rgba(124,183,255,0.15); padding: 10px 8px; vertical-align: top; }
      .table th { text-align: left; font-size: 13px; color: rgba(236,245,255,0.85); }
      .table td { font-size: 14px; color: #eef5ff; }
      li { margin: 0 0 12px; }
      code { font-size: 12px; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="panel">
        <h1>Community Intel</h1>
        <p class="muted">
          Polymarket 开发者/社区情报面板。来源只读：官方 Docs、GitHub、已保存的 X 观察摘要，以及明确标记的 Discord/TG 阻塞项。
          本页不执行发帖、进群、交易、签名、授权或资金操作。
        </p>
        <div class="toolbar">
          <a href="../index.html">返回主页</a>
          <a href="../market-intel/index.html">Market Intel</a>
          <a href="./community-intel-latest.json">community-intel-latest.json</a>
        </div>
        <p class="muted">生成时间：<strong>${escapeHtml(record.generatedAt)}</strong></p>
      </section>

      <section class="panel">
        <h2>Priority Workstreams</h2>
        <table class="table">
          <thead><tr><th>Workstream</th><th>Score</th><th>Signals</th><th>Next development action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Community / X Observations</h2>
        <ul>${observationItems || "<li>No saved observations.</li>"}</ul>
      </section>

      <section class="panel">
        <h2>Official GitHub</h2>
        <table class="table">
          <thead><tr><th>Repo</th><th>Stars</th><th>Open issues</th><th>Pushed at</th></tr></thead>
          <tbody>${repoRows}</tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Access Blockers</h2>
        <ul>
          ${record.blockers
            .map((item) => `<li><strong>${escapeHtml(item.channel)}</strong>: ${escapeHtml(item.blocker || "clear")} ${escapeHtml(item.next)}</li>`)
            .join("")}
        </ul>
      </section>
    </main>
  </body>
</html>
`;
}

export async function collectCommunityIntel() {
  const [docsIndex, githubRepos] = await Promise.all([fetchText(DOCS_INDEX_URL), fetchJson(GITHUB_ORG_REPOS_URL)]);
  const observations = loadObservations();
  const relevantDocs = docsIndex.ok ? extractRelevantDocs(docsIndex.text) : [];
  const recentRepos = githubRepos.ok ? summarizeRepos(githubRepos.data) : [];
  const workstreams = scoreWorkstreams({ observations, docs: relevantDocs, repos: recentRepos });

  return {
    generatedAt: nowInShanghai(),
    channels: CHANNELS,
    officialDocs: {
      source: DOCS_INDEX_URL,
      ok: docsIndex.ok,
      status: docsIndex.status,
      relevant: relevantDocs,
      error: docsIndex.error || ""
    },
    github: {
      source: GITHUB_ORG_REPOS_URL,
      ok: githubRepos.ok,
      status: githubRepos.status,
      recentRepos,
      error: githubRepos.error || ""
    },
    observations,
    workstreams,
    blockers: buildBlockers()
  };
}

export async function runCommunityIntel() {
  const record = await collectCommunityIntel();
  ensureDir("reports");
  ensureDir(OUTPUT_SITE_DIR);

  const jsonPath = reportPath(`community-intel-${REPORT_DATE}.json`);
  const txtPath = reportPath(`community-intel-${REPORT_DATE}.txt`);
  fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2), { mode: 0o600 });
  fs.writeFileSync(txtPath, renderTextReport(record), { mode: 0o600 });
  fs.writeFileSync(reportPath("community-intel-latest.json"), JSON.stringify(record, null, 2), { mode: 0o600 });
  fs.writeFileSync(reportPath("community-intel-latest.txt"), renderTextReport(record), { mode: 0o600 });
  fs.writeFileSync(LATEST_JSON, JSON.stringify(record, null, 2), "utf8");
  fs.writeFileSync(LATEST_HTML, renderHtml(record), "utf8");

  return { ok: true, reportJson: jsonPath, reportText: txtPath, siteHtml: LATEST_HTML, siteJson: LATEST_JSON };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCommunityIntel();
  console.log(JSON.stringify(result, null, 2));
}
