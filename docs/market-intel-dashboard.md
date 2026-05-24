# Market Intelligence Dashboard (Read-only)

Last updated: 2026-05-24

This track builds a **read-only** dashboard that summarizes market/rewards/ecosystem signals without placing orders, requesting wallet approvals, or moving funds.

## Principles / Guardrails

- Read-only sources only (public web pages + official public APIs where available).
- No trades, no order placement, no approvals, no deposits/withdrawals.
- No secrets embedded in UI, logs, reports, or published artifacts.
- All external links must be re-verified through official Polymarket sources before any credentialed action.

## MVP deliverable (local + static)

- A static HTML page generated from `site/evidence/daily-latest.json`:
  - `site/market-intel/index.html`
- A normalized JSON export (safe, no secrets):
  - `site/market-intel/market-intel-latest.json`
- A safe diff export (today vs yesterday, based on evidence trail):
  - `site/market-intel/market-intel-diff.json`
- Generation command:
  - `npm run site:market-intel`
- Included in `npm run verify`.

This is intentionally the first step so the Builder Profile Site can link to a deterministic, auditable snapshot page even before any richer data collectors are added.

## Data model (from daily snapshot JSON)

Input file: `site/evidence/daily-latest.json`

- `snapshot.builders.topProjects[]`
  - `name`
  - `oneMonthVolume`
- `snapshot.rewards.summary.sampleMarkets[]`
  - `market`
  - `maxSpread`
  - `minShares`
  - `reward`
- `snapshot.github[]`
  - `name`
  - `stars`
  - `forks`
  - `openIssues`
  - `pushedAt`

## Next upgrade steps (still read-only)

1. Done: normalized JSON export under `site/market-intel/market-intel-latest.json`.
2. Expand reward parsing to capture more rows (with a strict cap) and detect limited-time banners.
3. Add “staleness” checks:
   - compare `generatedAt` against local time
   - highlight missing/failed sections (builders/docs/rewards/github)
4. Done: safe “diff” export and HTML summary based on the most recent 2 evidence snapshots.
