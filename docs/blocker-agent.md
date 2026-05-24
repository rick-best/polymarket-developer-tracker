# Polymarket Safe Blocker Agent

Purpose: keep this project moving when external items are blocked, without performing trading, signing, account changes, public posts, live email, or live deployment.

Command:

```bash
npm run blocker:agent
```

## What It Does

- Refreshes the official read-only Polymarket snapshot.
- Regenerates the dry-run daily report under `reports/`.
- Refreshes `site/evidence/` from local reports.
- Regenerates the read-only Market Intelligence page.
- Regenerates the multi-product Builder ecosystem portfolio.
- Regenerates the draft-only official engagement queue for GitHub candidates, Builder actions, and X post drafts.
- Writes a blocker register to:
  - `reports/blocker-agent-YYYY-MM-DD.txt`
  - `reports/blocker-agent-YYYY-MM-DD.json`
  - `data/blocker-agent-latest.json`
  - `site/evidence/blocker-agent-latest.txt`
  - `site/evidence/blocker-agent-latest.json`

## What It Will Not Do

- No trading or order placement.
- No deposits, withdrawals, transfers, wallet signatures, wallet connections, or approvals.
- No new API key creation.
- No public posts or account changes.
- No GitHub comments, issues, PRs, public repository creation, or push without user confirmation.
- No live email send.
- No server deployment or service changes.
- No deletion or directory cleanup.

## Server Timer

Systemd templates:

- `automation/polymarket-blocker-agent.service.example`
- `automation/polymarket-blocker-agent.timer.example`

Before installing the timer on the Tencent server, run the deployment preflight in `docs/deployment.md` and record the result. Do not enable the timer if existing ports, services, cron jobs, timers, or project paths are unclear.

Recommended schedule: 09:10, 15:10, and 21:10 Asia/Shanghai. The agent is safe to run more often because it only performs read-only checks and local report/site generation.
