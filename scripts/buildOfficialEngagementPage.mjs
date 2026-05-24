import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join("site", "engagement");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "index.html");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "official-engagement-latest.json");
const PORTFOLIO_PATH = path.join("data", "product-portfolio.json");
const COMMUNITY_INTEL_PATH = path.join("site", "community-intel", "community-intel-latest.json");

const OFFICIAL_REPOS = [
  "Polymarket/clob-client-v2",
  "Polymarket/builder-relayer-client",
  "Polymarket/py-clob-client",
  "Polymarket/clob-client",
  "Polymarket/py-builder-relayer-client",
  "Polymarket/polymarket-cli"
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "polymarket-builder-engagement/0.1" }
    });
    if (!response.ok) {
      return { ok: false, status: response.status, data: null, error: `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: await response.json(), error: "" };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error?.message || String(error) };
  }
}

function issueScore(issue) {
  const title = String(issue.title || "").toLowerCase();
  let score = 0;
  for (const term of ["builder", "docs", "readme", "example", "type", "browser", "cloudflare", "websocket", "api"]) {
    if (title.includes(term)) score += 2;
  }
  if (Array.isArray(issue.labels) && issue.labels.some((label) => /bug|documentation|good first/i.test(label.name || ""))) {
    score += 2;
  }
  if (issue.comments > 0) score += 1;
  return score;
}

function normalizeIssue(repo, issue) {
  return {
    repo,
    number: issue.number,
    title: issue.title || "",
    url: issue.html_url || "",
    state: issue.state || "",
    comments: issue.comments || 0,
    createdAt: issue.created_at || "",
    updatedAt: issue.updated_at || "",
    labels: Array.isArray(issue.labels) ? issue.labels.map((label) => label.name).filter(Boolean) : [],
    score: issueScore(issue),
    candidateAction:
      "Review locally, reproduce with read-only or dry-run steps, then ask user before commenting, opening an issue, or submitting a PR."
  };
}

async function collectIssues() {
  const batches = await Promise.all(
    OFFICIAL_REPOS.map(async (repo) => {
      const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=12`;
      const result = await fetchJson(url);
      const issues = Array.isArray(result.data)
        ? result.data.filter((issue) => !issue.pull_request).map((issue) => normalizeIssue(repo, issue))
        : [];
      return { repo, source: url, ok: result.ok, status: result.status, error: result.error, issues };
    })
  );

  const candidates = batches
    .flatMap((batch) => batch.issues)
    .sort((a, b) => b.score - a.score || String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 15);

  return { batches, candidates };
}

function buildXDrafts(portfolio, communityIntel) {
  const products = Array.isArray(portfolio.products) ? portfolio.products : [];
  const ready = products.filter((p) => p.status === "local-ready" || p.status === "local-basic").slice(0, 6);
  const priorities = Array.isArray(communityIntel.workstreams) ? communityIntel.workstreams.slice(0, 4) : [];
  const readyNames = ready.map((p) => p.name).join(", ");
  const priorityNames = priorities.map((p) => p.title).join(", ");

  return [
    {
      title: "Portfolio launch draft",
      text:
        `Building a Polymarket ecosystem portfolio: ${products.length} products across Builder proof, market intel, API examples, SDK compatibility, and safety tooling. Local proof is live for: ${readyNames}. @Polymarket @PolymarketBuild`
    },
    {
      title: "Daily intel draft",
      text:
        `Today s Polymarket builder priorities from official docs/GitHub/community signals: ${priorityNames}. Turning these into read-only examples, issue candidates, and public proof before any trading integration. @PolymarketBuild`
    },
    {
      title: "Safety positioning draft",
      text:
        "Polymarket Developer Tracker is built around official links, read-only dashboards, dry-run examples, and no fake volume. Goal: useful builder tooling that can be reviewed publicly. @Polymarket @PolymarketBuild"
    }
  ];
}

function buildBuilderActions(portfolio) {
  const products = Array.isArray(portfolio.products) ? portfolio.products : [];
  return [
    {
      priority: "P1",
      action: "Publish stable Builder Profile Site URL",
      blocker: "Needs user-confirmed hosting target.",
      evidence: "site/index.html, site/portfolio/index.html, site/evidence/index.html"
    },
    {
      priority: "P1",
      action: "Push sanitized public GitHub repository",
      blocker: "Needs user-confirmed GitHub account/repo target.",
      evidence: "local commit plus docs/public-github-package.md"
    },
    {
      priority: "P1",
      action: "Submit official Builders Program form",
      blocker: "Needs user confirmation for Website URL, GitHub URL, contact fields, and Builder API key entry.",
      evidence: "docs/builder-submission-package.md"
    },
    {
      priority: "P2",
      action: `Ship next local product from ${products.length}-product portfolio`,
      blocker: "External publication is blocked until public GitHub/site target exists.",
      evidence: "data/product-portfolio.json"
    }
  ];
}

function renderIssue(issue) {
  return `<li>
    <a href="${escapeHtml(issue.url)}" rel="noreferrer">${escapeHtml(issue.repo)} #${escapeHtml(issue.number)}: ${escapeHtml(issue.title)}</a>
    <span>score ${escapeHtml(issue.score)} | ${escapeHtml(issue.candidateAction)}</span>
  </li>`;
}

function renderDraft(draft) {
  return `<article>
    <h2>${escapeHtml(draft.title)}</h2>
    <p>${escapeHtml(draft.text)}</p>
  </article>`;
}

function renderAction(action) {
  return `<li>
    <strong>${escapeHtml(action.priority)} ${escapeHtml(action.action)}</strong>
    <span>${escapeHtml(action.blocker)} Evidence: ${escapeHtml(action.evidence)}</span>
  </li>`;
}

function renderHtml(record) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Polymarket Official Engagement Queue</title>
    <meta
      name="description"
      content="Daily GitHub, Builder Program, and X engagement candidates for a Polymarket ecosystem portfolio. Draft-only until user confirmation."
    />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <main class="page">
      <section class="hero hero-compact">
        <p class="eyebrow">Draft-only external engagement</p>
        <h1>Daily path into the Polymarket developer orbit.</h1>
        <p class="lede">
          This page turns official GitHub issues, docs signals, and local product proof into concrete public engagement candidates.
          It does not post, comment, submit forms, or push code without user confirmation.
        </p>
      </section>

      <section class="panel">
        <h2>Builder Actions</h2>
        <ul class="entry-list">${record.builderActions.map(renderAction).join("")}</ul>
      </section>

      <section class="panel">
        <h2>GitHub Candidates</h2>
        <ul class="entry-list">${record.github.candidates.map(renderIssue).join("") || "<li>No candidates found.</li>"}</ul>
      </section>

      <section class="grid" aria-label="X post drafts">
        ${record.xDrafts.map(renderDraft).join("")}
      </section>
    </main>
  </body>
</html>
`;
}

export async function buildOfficialEngagementPage() {
  const portfolio = safeReadJson(PORTFOLIO_PATH, { products: [] });
  const communityIntel = safeReadJson(COMMUNITY_INTEL_PATH, { workstreams: [] });
  const github = await collectIssues();
  const record = {
    generatedAt: new Date().toISOString(),
    scope: "draft-only",
    guardrails: [
      "No automatic GitHub comments, issues, PRs, pushes, or repository creation.",
      "No automatic X posts, likes, replies, follows, or DMs.",
      "No Builder form submission, wallet connection, API-key entry, or trading without user confirmation."
    ],
    builderActions: buildBuilderActions(portfolio),
    github,
    xDrafts: buildXDrafts(portfolio, communityIntel)
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(record, null, 2)}\n`);
  fs.writeFileSync(OUTPUT_HTML, renderHtml(record));
  return { output: OUTPUT_HTML, json: OUTPUT_JSON, candidates: github.candidates.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await buildOfficialEngagementPage();
  console.log(JSON.stringify(result, null, 2));
}
