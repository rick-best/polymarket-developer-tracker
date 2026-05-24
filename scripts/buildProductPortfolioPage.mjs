import fs from "node:fs";
import path from "node:path";

const INPUT = path.join("data", "product-portfolio.json");
const OUTPUT_DIR = path.join("site", "portfolio");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "index.html");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "product-portfolio.json");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readPortfolio() {
  const raw = fs.readFileSync(INPUT, "utf8");
  return JSON.parse(raw);
}

function statusLabel(status) {
  const labels = {
    "local-ready": "Local ready",
    "local-basic": "Local basic",
    planned: "Planned",
    "draft-only": "Draft only"
  };
  return labels[status] || status;
}

function renderProduct(product, index) {
  const publicUrl = String(product.publicUrl || "");
  const link = publicUrl.startsWith("site/")
    ? `<a href="../${escapeHtml(publicUrl.replace(/^site\//, ""))}" rel="noreferrer">Open proof</a>`
    : publicUrl
      ? `<span class="muted">Local artifact: ${escapeHtml(publicUrl)}</span>`
      : `<span class="muted">No public artifact yet</span>`;

  return `<article class="product-card">
    <div class="product-topline">
      <span class="rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="pill">${escapeHtml(statusLabel(product.status))}</span>
    </div>
    <h2>${escapeHtml(product.name)}</h2>
    <p class="category">${escapeHtml(product.category)}</p>
    <p>${escapeHtml(product.purpose)}</p>
    <dl>
      <div>
        <dt>Official exposure</dt>
        <dd>${escapeHtml(product.officialExposure)}</dd>
      </div>
      <div>
        <dt>Next action</dt>
        <dd>${escapeHtml(product.nextAction)}</dd>
      </div>
    </dl>
    <p class="proof-link">${link}</p>
  </article>`;
}

function renderEntryPath(pathItem) {
  return `<li>
    <a href="${escapeHtml(pathItem.url)}" rel="noreferrer">${escapeHtml(pathItem.name)}</a>
    <span>${escapeHtml(pathItem.action)}</span>
  </li>`;
}

function renderHtml(portfolio) {
  const products = Array.isArray(portfolio.products) ? portfolio.products : [];
  const ready = products.filter((p) => p.status === "local-ready" || p.status === "local-basic").length;
  const planned = products.length - ready;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Polymarket Ecosystem Portfolio</title>
    <meta
      name="description"
      content="A multi-product Polymarket ecosystem portfolio for Builder Program review, official GitHub contributions, and safe public build updates."
    />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <main class="page">
      <section class="hero hero-compact">
        <p class="eyebrow">Builder ecosystem portfolio</p>
        <h1>More than one product. A visible Polymarket builder system.</h1>
        <p class="lede">${escapeHtml(portfolio.mission)}</p>
        <div class="metric-row" aria-label="Portfolio metrics">
          <div><strong>${products.length}</strong><span>Products</span></div>
          <div><strong>${ready}</strong><span>Local proof</span></div>
          <div><strong>${planned}</strong><span>Queued</span></div>
          <div><strong>${categories.length}</strong><span>Tracks</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>Official Entry Paths</h2>
        <ul class="entry-list">
          ${(portfolio.officialEntryPaths || []).map(renderEntryPath).join("")}
        </ul>
      </section>

      <section class="portfolio-grid" aria-label="Polymarket ecosystem products">
        ${products.map(renderProduct).join("")}
      </section>
    </main>
  </body>
</html>
`;
}

export function buildProductPortfolioPage() {
  const portfolio = readPortfolio();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(portfolio, null, 2)}\n`);
  fs.writeFileSync(OUTPUT_HTML, renderHtml(portfolio));
  return { output: OUTPUT_HTML, json: OUTPUT_JSON, products: portfolio.products?.length || 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = buildProductPortfolioPage();
  console.log(JSON.stringify(result, null, 2));
}
