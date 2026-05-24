import fs from "node:fs";
import path from "node:path";

const REPORTS_DIR = "reports";
const EVIDENCE_DIR = path.join("site", "evidence");

function listDailyReports(extension) {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs
    .readdirSync(REPORTS_DIR)
    .filter((name) => name.startsWith("daily-") && name.endsWith(extension))
    .map((name) => path.join(REPORTS_DIR, name));
}

function extractDate(filePath) {
  const base = path.basename(filePath);
  const match = base.match(/^daily-(\d{4}-\d{2}-\d{2})\./);
  return match ? match[1] : null;
}

function sortByDateDesc(paths) {
  return [...paths].sort((a, b) => {
    const da = extractDate(a) ?? "";
    const db = extractDate(b) ?? "";
    return db.localeCompare(da);
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, dest) {
  fs.copyFileSync(source, dest);
  fs.chmodSync(dest, 0o644);
}

function buildIndexHtml(entries) {
  const items = entries
    .map((entry) => {
      const date = entry.date;
      const txt = entry.txt ? `<a href="./${entry.txtName}">txt</a>` : "txt missing";
      const json = entry.json ? `<a href="./${entry.jsonName}">json</a>` : "json missing";
      return `<li><strong>${date}</strong> — ${txt} · ${json}</li>`;
    })
    .join("\n          ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Polymarket Developer Tracker — Evidence</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; padding: 40px; background: #05070b; color: #eef5ff; font-family: ui-sans-serif, system-ui, -apple-system; }
      a { color: #7cb7ff; }
      .muted { color: #a7b4c8; }
      code { color: #eef5ff; }
      ul { line-height: 1.7; }
    </style>
  </head>
  <body>
    <h1>Evidence Trail</h1>
    <p class="muted">Static copies of the latest daily reports produced by this project.</p>
    <p class="muted">Tip: run <code>npm run site:evidence</code> to refresh.</p>
    <h2>Recent</h2>
    <ul>
      ${items}
    </ul>
  </body>
</html>
`;
}

export function buildSiteEvidence({ keep = 10 } = {}) {
  const txtReports = sortByDateDesc(listDailyReports(".txt"));
  const jsonReports = sortByDateDesc(listDailyReports(".json"));

  const dates = new Set();
  for (const filePath of [...txtReports, ...jsonReports]) {
    const date = extractDate(filePath);
    if (date) dates.add(date);
  }

  const sortedDates = [...dates].sort((a, b) => b.localeCompare(a)).slice(0, keep);

  ensureDir(EVIDENCE_DIR);

  const entries = [];
  for (const date of sortedDates) {
    const txt = path.join(REPORTS_DIR, `daily-${date}.txt`);
    const json = path.join(REPORTS_DIR, `daily-${date}.json`);
    const txtExists = fs.existsSync(txt);
    const jsonExists = fs.existsSync(json);

    const txtName = `daily-${date}.txt`;
    const jsonName = `daily-${date}.json`;

    if (txtExists) copyFile(txt, path.join(EVIDENCE_DIR, txtName));
    if (jsonExists) copyFile(json, path.join(EVIDENCE_DIR, jsonName));

    entries.push({
      date,
      txt: txtExists,
      json: jsonExists,
      txtName,
      jsonName
    });
  }

  if (entries.length > 0) {
    const latestDate = entries[0].date;
    const latestTxt = path.join(EVIDENCE_DIR, `daily-${latestDate}.txt`);
    const latestJson = path.join(EVIDENCE_DIR, `daily-${latestDate}.json`);

    if (fs.existsSync(latestTxt)) copyFile(latestTxt, path.join(EVIDENCE_DIR, "daily-latest.txt"));
    if (fs.existsSync(latestJson)) copyFile(latestJson, path.join(EVIDENCE_DIR, "daily-latest.json"));
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, "index.html"), buildIndexHtml(entries), "utf8");

  return {
    evidenceDir: EVIDENCE_DIR,
    copiedDates: entries.map((e) => e.date),
    latest: entries[0]?.date ?? null
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = buildSiteEvidence();
  console.log(JSON.stringify(result, null, 2));
}
