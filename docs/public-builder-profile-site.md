# Public Builder Profile Site — Publishing Plan (Static)

Goal: publish the static site in `site/` to a public URL that can be used as the Builders Program “Website URL”, without introducing server risk or any trading/wallet actions.

This project intentionally keeps the site static:
- No visitor tracking requirement
- No wallet connect prompts
- No approvals/signing/claims
- No embedded secrets

## What must be public

- `site/index.html`
- `site/styles.css`
- `site/evidence/` (generated from `reports/daily-*.{txt,json}`)
- `site/market-intel/` (read-only dashboard)
- `site/community-intel/` (read-only developer/community intelligence)

The evidence folder must include:
- `site/evidence/index.html`
- `site/evidence/daily-latest.txt`
- `site/evidence/daily-latest.json`

## Safe publishing targets (no server changes)

Choose ONE of the below and keep it minimal:

- GitHub Pages: publish the `site/` directory as a static website (custom domain optional).
- Static hosting providers (e.g., Netlify / Vercel / Cloudflare Pages): publish `site/` as the site root.

Notes:
- Prefer a host that supports “folder as site root” without a build step.
- Keep the URL stable (avoid preview-only links).
- Do not add third-party scripts or analytics during the initial Builder URL publication.

## Hosting decision matrix

| Target | Fit | Operational risk | Recommendation |
| --- | --- | --- | --- |
| GitHub Pages | Good if the site can live in a repo-backed static folder | Low; no server ports or background services | Recommended default after user confirms repo/account target |
| Cloudflare Pages | Good if a stable static URL is needed without touching the Tencent server | Low; requires account/project selection | Acceptable after user confirms account/project |
| Netlify | Good for quick static hosting with folder-as-root support | Low; requires account/project selection | Acceptable after user confirms account/project |
| Vercel | Good for static hosting, but may add framework/project defaults | Low to medium; keep build disabled/minimal | Use only if user prefers Vercel |
| Existing Tencent server | Technically possible | Medium; must inspect ports, nginx, services, timers, cron, and paths first | Blocked until explicit user confirmation and fresh preflight |

Current recommendation: use a no-server static host and publish `site/` as-is. Do not deploy to the existing Tencent server for the Builder Profile Site unless the user explicitly chooses that route and confirms the preflight.

## Builder submission dependency

This public URL is now a P1 blocker for official Builder Program participation. The Builders form asks for a Website URL; until `site/` is published at a stable public URL, the project can only prepare the application package and cannot make a strong official submission.

Prepared submission package:

- `docs/builder-submission-package.md`

## Pre-publish checklist (local-only)

1. Refresh the latest daily snapshot (dry-run only):
   - `npm run report:dry`
2. Refresh static evidence copies:
   - `npm run site:evidence`
3. Verify required artifacts exist:
   - `npm run verify` (must include `siteEvidenceExists` and `siteEvidenceLatestExists`)
4. Open `site/index.html` locally and confirm:
   - Evidence links resolve (`/evidence` + daily-latest files)
   - No secrets appear anywhere
   - No wallet-connect prompts exist

## Post-publish checklist (manual, read-only)

- Confirm the public URL loads `index.html`.
- Confirm `.../evidence/index.html` loads and lists the latest date.
- Confirm `.../evidence/daily-latest.txt` loads and matches the latest report date.

## Update cadence

- Any time a new `reports/daily-YYYY-MM-DD.*` is created, run:
  - `npm run site:evidence`
- Keep the published `site/evidence/` updated so “daily-latest.*” reflects the newest report.
