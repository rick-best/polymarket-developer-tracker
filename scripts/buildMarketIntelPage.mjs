import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.join("site", "evidence");
const INPUT_JSON = path.join(EVIDENCE_DIR, "daily-latest.json");
const OUTPUT_DIR = path.join("site", "market-intel");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "index.html");
const OUTPUT_LATEST_JSON = path.join(OUTPUT_DIR, "market-intel-latest.json");
const OUTPUT_DIFF_JSON = path.join(OUTPUT_DIR, "market-intel-diff.json");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readLatestSnapshot() {
  if (!fs.existsSync(INPUT_JSON)) {
    return { ok: false, error: `Missing ${INPUT_JSON}`, data: null };
  }

  const raw = fs.readFileSync(INPUT_JSON, "utf8");
  const parsed = JSON.parse(raw);
  return { ok: true, error: "", data: parsed };
}

function listEvidenceDailyJsonDesc() {
  if (!fs.existsSync(EVIDENCE_DIR)) return [];
  const names = fs.readdirSync(EVIDENCE_DIR);
  const daily = names
    .filter((name) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort((a, b) => b.localeCompare(a))
    .map((name) => path.join(EVIDENCE_DIR, name));
  return daily;
}

function safeJsonParse(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { ok: true, error: "", data: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: `Failed to parse ${filePath}: ${error?.message || String(error)}`, data: null };
  }
}

function normalizeRunRecord(record) {
  const snapshot = record?.snapshot ?? {};
  const builders = snapshot?.builders ?? {};
  const rewards = snapshot?.rewards ?? {};
  const github = Array.isArray(snapshot?.github) ? snapshot.github : [];

  return {
    generatedAt: record?.generatedAt ?? "",
    collectedAt: snapshot?.collectedAt ?? "",
    sections: {
      builders: { ok: !!builders.ok, status: builders.status ?? null },
      docs: { ok: !!snapshot?.builderDocs?.ok, status: snapshot?.builderDocs?.status ?? null },
      rewards: { ok: !!rewards.ok, status: rewards.status ?? null },
      github: { ok: github.every((repo) => repo?.ok !== false) }
    },
    builders: {
      topProjects: Array.isArray(builders?.topProjects)
        ? builders.topProjects.map((p) => ({
            name: p?.name ?? "",
            oneMonthVolume: p?.oneMonthVolume ?? ""
          }))
        : []
    },
    rewards: {
      sampleMarkets:
        Array.isArray(rewards?.summary?.sampleMarkets)
          ? rewards.summary.sampleMarkets.map((m) => ({
              market: m?.market ?? "",
              maxSpread: m?.maxSpread ?? "",
              minShares: m?.minShares ?? "",
              reward: m?.reward ?? ""
            }))
          : []
    },
    github: github.map((r) => ({
      name: r?.name ?? "",
      stars: r?.stars ?? null,
      forks: r?.forks ?? null,
      openIssues: r?.openIssues ?? null,
      pushedAt: r?.pushedAt ?? ""
    }))
  };
}

function diffKeyedArrays({ today, yesterday, key, pick }) {
  const todayMap = new Map();
  const yesterdayMap = new Map();
  for (const item of today) todayMap.set(key(item), pick(item));
  for (const item of yesterday) yesterdayMap.set(key(item), pick(item));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [k, v] of todayMap.entries()) {
    if (!yesterdayMap.has(k)) {
      added.push({ key: k, today: v, yesterday: null });
      continue;
    }
    const prev = yesterdayMap.get(k);
    if (JSON.stringify(prev) !== JSON.stringify(v)) {
      changed.push({ key: k, today: v, yesterday: prev });
    }
  }

  for (const [k, v] of yesterdayMap.entries()) {
    if (!todayMap.has(k)) removed.push({ key: k, today: null, yesterday: v });
  }

  return { added, removed, changed };
}

function computeDiff(todayNorm, yesterdayNorm) {
  if (!todayNorm || !yesterdayNorm) {
    return {
      ok: false,
      error: "Missing today or yesterday snapshot",
      summary: null,
      details: null
    };
  }

  const builders = diffKeyedArrays({
    today: todayNorm.builders.topProjects,
    yesterday: yesterdayNorm.builders.topProjects,
    key: (p) => p.name,
    pick: (p) => ({ oneMonthVolume: p.oneMonthVolume })
  });

  const rewards = diffKeyedArrays({
    today: todayNorm.rewards.sampleMarkets,
    yesterday: yesterdayNorm.rewards.sampleMarkets,
    key: (m) => m.market,
    pick: (m) => ({ maxSpread: m.maxSpread, minShares: m.minShares, reward: m.reward })
  });

  const github = diffKeyedArrays({
    today: todayNorm.github,
    yesterday: yesterdayNorm.github,
    key: (r) => r.name,
    pick: (r) => ({ stars: r.stars, forks: r.forks, openIssues: r.openIssues, pushedAt: r.pushedAt })
  });

  const sectionStatus = [];
  for (const sectionName of ["builders", "docs", "rewards"]) {
    const t = todayNorm.sections[sectionName];
    const y = yesterdayNorm.sections[sectionName];
    if (JSON.stringify(t) !== JSON.stringify(y)) {
      sectionStatus.push({ section: sectionName, today: t, yesterday: y });
    }
  }

  const summary = {
    todayCollectedAt: todayNorm.collectedAt,
    yesterdayCollectedAt: yesterdayNorm.collectedAt,
    changes: {
      builders: builders.added.length + builders.removed.length + builders.changed.length,
      rewards: rewards.added.length + rewards.removed.length + rewards.changed.length,
      github: github.added.length + github.removed.length + github.changed.length,
      sectionStatus: sectionStatus.length
    }
  };

  return {
    ok: true,
    error: "",
    summary,
    details: {
      sectionStatus,
      builders,
      rewards,
      github
    }
  };
}

function renderTable({ caption, headers, rows }) {
  const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<table class="table">
    <caption>${escapeHtml(caption)}</caption>
    ${thead}
    ${tbody}
  </table>`;
}

function renderDiffHtml(diff) {
  if (!diff?.ok) {
    return `<p class="muted">Diff：不可用（${escapeHtml(diff?.error || "unknown error")}）</p>`;
  }

  const s = diff.summary?.changes ?? {};
  const items = [];

  if (s.sectionStatus) items.push(`Section 状态变化：${s.sectionStatus}`);
  if (s.builders) items.push(`Builders leaderboard 变化：${s.builders}`);
  if (s.rewards) items.push(`Rewards 样例市场变化：${s.rewards}`);
  if (s.github) items.push(`GitHub 仓库变化：${s.github}`);

  const details = diff.details ?? {};
  const statusLines = (details.sectionStatus ?? [])
    .map((entry) => {
      const y = entry.yesterday;
      const t = entry.today;
      return `<li><code>${escapeHtml(entry.section)}</code>: ${escapeHtml(JSON.stringify(y))} → ${escapeHtml(
        JSON.stringify(t)
      )}</li>`;
    })
    .join("");

  return `
    <p class="muted">Diff 对比：昨天 vs 今天（基于 evidence 里的最近两份 daily JSON）</p>
    <ul class="muted">
      ${items.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
    </ul>
    ${statusLines ? `<details class="muted"><summary>查看 section 状态变化</summary><ul>${statusLines}</ul></details>` : ""}
  `;
}

function buildHtml({ generatedAt, snapshot, diff }) {
  const builders = snapshot?.builders?.topProjects ?? [];
  const rewards = snapshot?.rewards?.summary?.sampleMarkets ?? [];
  const github = snapshot?.github ?? [];

  const buildersTable = renderTable({
    caption: "Builders Leaderboard（样例）",
    headers: ["Project", "One-month volume"],
    rows: builders.map((p) => [escapeHtml(p.name ?? ""), escapeHtml(p.oneMonthVolume ?? "")])
  });

  const rewardsTable = renderTable({
    caption: "Rewards 页面样例市场（只读快照）",
    headers: ["Market", "Max spread", "Min shares", "Reward"],
    rows: rewards.map((m) => [
      escapeHtml(m.market ?? ""),
      escapeHtml(m.maxSpread ?? ""),
      escapeHtml(m.minShares ?? ""),
      escapeHtml(m.reward ?? "")
    ])
  });

  const githubTable = renderTable({
    caption: "GitHub 仓库快照（样例）",
    headers: ["Repo", "Stars", "Forks", "Open issues", "Pushed at (UTC)"],
    rows: github.map((r) => [
      escapeHtml(r.name ?? ""),
      escapeHtml(r.stars ?? ""),
      escapeHtml(r.forks ?? ""),
      escapeHtml(r.openIssues ?? ""),
      escapeHtml(r.pushedAt ?? "")
    ])
  });

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Market Intelligence — Polymarket Developer Tracker</title>
    <link rel="stylesheet" href="../styles.css" />
    <style>
      .page { max-width: 980px; }
      .muted { color: rgba(236,245,255,0.75); }
      .toolbar { display:flex; gap:12px; flex-wrap:wrap; margin: 18px 0 28px; }
      .toolbar a { display:inline-block; padding:10px 12px; border-radius: 12px; border: 1px solid rgba(124,183,255,0.25); background: rgba(9,15,27,0.6); color: #eef5ff; text-decoration:none; }
      .table { width: 100%; border-collapse: collapse; margin: 18px 0 28px; }
      .table caption { text-align: left; font-weight: 650; margin-bottom: 10px; }
      .table th, .table td { border-bottom: 1px solid rgba(124,183,255,0.15); padding: 10px 8px; vertical-align: top; }
      .table th { text-align: left; font-size: 13px; color: rgba(236,245,255,0.85); }
      .table td { font-size: 14px; color: #eef5ff; }
      code { font-size: 12px; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="panel">
        <h1>Market Intelligence（只读）</h1>
        <p class="muted">
          本页由 <code>site/evidence/daily-latest.json</code> 生成，仅用于展示项目的只读市场/奖励/开发者生态快照，
          不包含任何下单、授权或资金操作。
        </p>
        <div class="toolbar" aria-label="navigation">
          <a href="../index.html">返回主页</a>
          <a href="../evidence/index.html">Evidence Trail</a>
          <a href="../evidence/daily-latest.json">daily-latest.json</a>
          <a href="../evidence/daily-latest.txt">daily-latest.txt</a>
          <a href="./market-intel-latest.json">market-intel-latest.json</a>
          <a href="./market-intel-diff.json">market-intel-diff.json</a>
        </div>
        <p class="muted">快照生成时间：<strong>${escapeHtml(generatedAt ?? "")}</strong></p>
      </section>

      <section class="panel">
        <h2>Diff vs yesterday</h2>
        ${renderDiffHtml(diff)}
      </section>

      <section class="panel">
        ${buildersTable}
      </section>

      <section class="panel">
        ${rewardsTable}
      </section>

      <section class="panel">
        ${githubTable}
      </section>
    </main>
  </body>
</html>
`;
}

export function buildMarketIntelPage() {
  const latest = readLatestSnapshot();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!latest.ok) {
    fs.writeFileSync(
      OUTPUT_HTML,
      buildHtml({ generatedAt: "", snapshot: {}, diff: { ok: false, error: latest.error } }).replace(
        "Market Intelligence（只读）",
        `Market Intelligence（只读）— 无法生成：${escapeHtml(latest.error)}`
      ),
      "utf8"
    );
    return { ok: false, error: latest.error, output: OUTPUT_HTML };
  }

  const todayRecord = latest.data;
  const todayNorm = normalizeRunRecord(todayRecord);

  const dailyEvidence = listEvidenceDailyJsonDesc();
  const yesterdayPath = dailyEvidence.length > 1 ? dailyEvidence[1] : null;
  const yesterdayParsed = yesterdayPath ? safeJsonParse(yesterdayPath) : { ok: false, error: "No yesterday file", data: null };
  const yesterdayNorm = yesterdayParsed.ok ? normalizeRunRecord(yesterdayParsed.data) : null;
  const diff = yesterdayNorm ? computeDiff(todayNorm, yesterdayNorm) : { ok: false, error: yesterdayParsed.error };

  fs.writeFileSync(OUTPUT_LATEST_JSON, JSON.stringify(todayNorm, null, 2), "utf8");
  fs.writeFileSync(OUTPUT_DIFF_JSON, JSON.stringify(diff, null, 2), "utf8");

  const generatedAt = todayRecord?.generatedAt ?? todayRecord?.snapshot?.collectedAt ?? "";
  fs.writeFileSync(OUTPUT_HTML, buildHtml({ generatedAt, snapshot: todayRecord?.snapshot ?? {}, diff }), "utf8");
  return { ok: true, error: "", output: OUTPUT_HTML, outputLatestJson: OUTPUT_LATEST_JSON, outputDiffJson: OUTPUT_DIFF_JSON };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = buildMarketIntelPage();
  console.log(JSON.stringify(result, null, 2));
}
