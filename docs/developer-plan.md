# Polymarket Developer Participation Plan

Last updated: 2026-05-25

Contribution wallet for official forms: `0x31d2621184901ea3fb3b11299a40f495f8e08ed1`

## Positioning

Build as a real ecosystem developer, not as a sybil or wash-volume actor. The work is now split into a small ecosystem project portfolio tracked in `docs/ecosystem-roadmap.md`:

1. Public Builder Profile Site for Builder Program review.
2. Polymarket Builder Tracker for daily evidence and official source monitoring.
3. Market Intelligence Dashboard for read-only market quality signals.
4. Risk & Compliance Monitor for wash-volume and integrity risk reporting.
5. Polymarket API Examples Kit for reusable developer examples.
6. Alert Bot for dry-run official update and market-change notifications.

## Current Builder Participation Focus

The immediate objective is no longer just monitoring. The project must become externally verifiable as a Polymarket Builder ecosystem project:

1. Publish the static Builder Profile Site to a stable public URL.
2. Create or connect a public GitHub repository with sanitized project files.
3. Submit the official Builders Program application after user confirms contact fields, Website URL, and any Builder API key entry.
4. Create or update the official Builder profile and attach the contribution/reward address only through verified official Polymarket pages.
5. Keep building public, low-risk developer deliverables: API Examples Kit, compatibility checker, Market Intel, Community Intel, and Risk Monitor.

Prepared package: `docs/builder-submission-package.md`.

## 30-Day Execution Table

| Day | Workstream | Deliverable | Evidence to Track |
| --- | --- | --- | --- |
| 1 | Foundation | Official link safety check, wallet generation, repo scaffold, daily report dry-run | `data/official-links.json`, wallet address, first dry-run |
| 2 | Builder application | Draft Builders form content and submit after login approval | Screenshot/confirmation, builder profile status |
| 3 | Docs/API | Implement Gamma market collector and Rewards scanner | JSON snapshot, report section |
| 4 | GitHub | Fork or clone official `agents` repo for local study | fork URL or local notes |
| 5 | MVP | Build first CLI scanner: rewards, volume, spread, liquidity | CLI output and daily email |
| 6 | Public proof | Create project page/README and publish initial update | URL, X/Discord post text |
| 7 | Builder code | Add `builderCode` support once issued | config check, test order dry-run |
| 8-10 | Analytics | Add market ranking, volatility, expiry, stale data detection | daily ranked table |
| 11-14 | Bot prototype | Telegram/Discord alert prototype, no private-key collection | demo logs |
| 15 | Compliance review | Check Code of Conduct and remove any risky behavior | review note |
| 16-20 | User growth | Share updates, collect feedback, improve UX | feedback links |
| 21-25 | Trading workflow | Add guarded order preview; live trading only after explicit approval | dry-run previews |
| 26-30 | Grant package | Prepare grant/update package with metrics, repo, roadmap | application update |

## Daily 21:00 Report Checklist

- Official link health and redirect changes.
- Builders leaderboard top projects and volume snapshot.
- Rewards page snapshot and notable high-reward markets.
- GitHub official repo activity for `agents` and `py-clob-client`.
- Work completed today.
- Blockers that need user action: login, SMTP auth, builder code, API key, MetaMask unlock, server SSH/console.
- Next-day task list.

## Guardrails

- No spoofing, wash trading, artificial volume, or misleading project claims.
- No private key collection in any public UI or bot.
- Live trading and approvals require explicit manual confirmation.
- All links are rechecked before entering credentials or secrets.
- Server deployment must inspect existing processes, ports, cron/systemd jobs first.
