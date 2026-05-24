import { loadJson, nowInShanghai } from "./config.mjs";

const SOURCES = {
  builders: "https://builders.polymarket.com/",
  builderDocs: "https://docs.polymarket.com/builders/overview",
  rewards: "https://polymarket.com/rewards",
  agentsRepo: "https://api.github.com/repos/Polymarket/agents",
  pyClobRepo: "https://api.github.com/repos/Polymarket/py-clob-client"
};
const MAX_HTML_TEXT_BYTES = 2_000_000;

export async function collectPolymarketSnapshot() {
  const [builders, builderDocs, rewards, agentsRepo, pyClobRepo] = await Promise.all([
    fetchText(SOURCES.builders),
    fetchText(SOURCES.builderDocs),
    fetchText(SOURCES.rewards),
    fetchJson(SOURCES.agentsRepo),
    fetchJson(SOURCES.pyClobRepo)
  ]);

  return {
    collectedAt: nowInShanghai(),
    officialLinks: summarizeOfficialLinks(),
    builders: {
      source: SOURCES.builders,
      ok: builders.ok,
      status: builders.status,
      topProjects: parseBuilderLeaderboard(builders.text),
      applicationFields: parseApplicationFields(builders.text),
      error: builders.error || ""
    },
    builderDocs: {
      source: SOURCES.builderDocs,
      ok: builderDocs.ok,
      status: builderDocs.status,
      highlights: parseBuilderDocs(builderDocs.text),
      error: builderDocs.error || ""
    },
    rewards: {
      source: SOURCES.rewards,
      ok: rewards.ok,
      status: rewards.status,
      summary: parseRewards(rewards.text),
      error: rewards.error || ""
    },
    github: [
      summarizeRepo("Polymarket/agents", agentsRepo),
      summarizeRepo("Polymarket/py-clob-client", pyClobRepo)
    ]
  };
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "polymarket-developer-tracker/0.1" }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url, text };
  } catch (error) {
    return { ok: false, status: 0, url, text: "", error: error.message };
  }
}

async function fetchJson(url) {
  const result = await fetchText(url);
  if (!result.ok) return { ...result, data: null };
  try {
    return { ...result, data: JSON.parse(result.text) };
  } catch (error) {
    return { ...result, ok: false, error: error.message, data: null };
  }
}

function summarizeOfficialLinks() {
  const data = loadJson("data/official-links.json", { links: [] });
  return data.links.map((link) => ({
    name: link.name,
    url: link.url,
    status: link.status
  }));
}

function parseBuilderLeaderboard(html) {
  const text = htmlToText(html);
  const known = ["Betmoar.fun", "PolyCop", "Polymtrade", "Polygun", "PolyTraderPro", "Stand.trade", "Kreo", "Chance", "Polymer", "Jupiter"];
  return known
    .map((name) => {
      const idx = text.indexOf(name);
      if (idx === -1) return null;
      const after = text.slice(idx + name.length, idx + name.length + 80);
      const volume = after.match(/\$[0-9,.]+[KMB]?/u)?.[0] || "";
      return { name, oneMonthVolume: volume };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function parseApplicationFields(html) {
  const text = htmlToText(html);
  const fields = ["Your Project", "Product Name", "Project Description", "Website URL", "Email", "X Handle", "Telegram Handle", "Builder API key"];
  return fields.filter((field) => text.includes(field));
}

function parseBuilderDocs(html) {
  const text = htmlToText(html);
  const checks = [
    ["Builder profile", "Create Builder Profile"],
    ["Builder code attribution", "Attach Builder Code"],
    ["Gasless relayer", "Gasless Transactions"],
    ["Volume tracking", "Volume Tracking"],
    ["Leaderboard", "Builder Leaderboard"]
  ];
  return checks.filter(([, needle]) => text.includes(needle)).map(([label]) => label);
}

function parseRewards(html) {
  const text = htmlToText(html);
  const hasDailyRewards = text.includes("Daily Rewards");
  const sampleMarkets = [];
  const pattern = /([A-Z][A-Za-z0-9:' .()/-]{12,90})\s+Rules\s+±([0-9]+¢)\s+([0-9]+)\s+([0-9]+)/gu;
  for (const match of text.matchAll(pattern)) {
    sampleMarkets.push({
      market: match[1].trim(),
      maxSpread: `±${match[2]}`,
      minShares: match[3],
      reward: match[4]
    });
    if (sampleMarkets.length >= 8) break;
  }
  return { hasDailyRewards, sampleMarkets };
}

function summarizeRepo(name, result) {
  const data = result.data || {};
  return {
    name,
    ok: result.ok,
    status: result.status,
    description: data.description || "",
    stars: data.stargazers_count ?? null,
    forks: data.forks_count ?? null,
    openIssues: data.open_issues_count ?? null,
    pushedAt: data.pushed_at || "",
    defaultBranch: data.default_branch || "",
    htmlUrl: data.html_url || `https://github.com/${name}`,
    error: result.error || ""
  };
}

function htmlToText(html) {
  let text = String(html || "");
  if (text.length > MAX_HTML_TEXT_BYTES) text = text.slice(0, MAX_HTML_TEXT_BYTES);
  text = stripTagBlock(text, "script");
  text = stripTagBlock(text, "style");
  return text
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function stripTagBlock(input, tagName) {
  const lower = input.toLowerCase();
  const open = `<${tagName}`;
  const close = `</${tagName}>`;
  let output = "";
  let cursor = 0;

  while (cursor < input.length) {
    const start = lower.indexOf(open, cursor);
    if (start === -1) {
      output += input.slice(cursor);
      break;
    }

    output += input.slice(cursor, start);
    const end = lower.indexOf(close, start);
    if (end === -1) break;
    cursor = end + close.length;
  }

  return output;
}
