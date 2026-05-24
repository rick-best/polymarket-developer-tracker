# Polymarket Developer Tracker

This project tracks Polymarket builder participation work and sends a daily 21:00 Asia/Shanghai email report.

## Current Status

- Official links checked: `data/official-links.json`
- Developer plan: `docs/developer-plan.md`
- Ecosystem roadmap: `docs/ecosystem-roadmap.md`
- Builder submission package: `docs/builder-submission-package.md`
- Public GitHub package checklist: `docs/public-github-package.md`
- Official engagement workflow: `docs/official-engagement-workflow.md`
- Public profile site draft: `site/index.html`
- Product portfolio: `site/portfolio/index.html`
- Official engagement queue: `site/engagement/index.html`
- Deployment guardrails: `docs/deployment.md`
- Daily dry-run report: `reports/daily-2026-05-18.txt`
- Hot wallet file: `secure/wallets/polymarket-developer-wallet.json`

## Commands

```bash
npm run email:status
npm run email:dry
npm run email:verify
npm run email:send
npm run blocker:agent
npm run site:portfolio
npm run site:engagement
npm run verify
```

`email:send` requires `EMAIL_SMTP_PASS` in `/etc/polymarket-developer-tracker.env`, a project `.env`, or process environment variables. `email:verify` checks SMTP connectivity without sending a message.

`blocker:agent` is the safe automation loop. It refreshes dry-run reports, site evidence, the Market Intelligence page, Community Intel, Product Portfolio, Official Engagement queue, and a blocker register without live email, trading, wallet signing, GitHub posting/pushing, account changes, public posts, or deployment actions. See `docs/blocker-agent.md`.

## Environment

For local development, create `.env` from `.env.example` and fill the missing secrets:

```bash
cp .env.example .env
```

On the server, prefer `/etc/polymarket-developer-tracker.env` with owner-only permissions. Do not commit `.env` or `secure/`.

## Server

Before deploying on the Tencent Lighthouse instance, inspect existing processes, ports, services, timers, and cron jobs. Use the checklist in `docs/deployment.md`; production mail scheduling should use the systemd timer template in `automation/`.

## Wallet

Current developer hot wallet:

`0xaC7f1a140771d35d6930091C1D1b4142F101F6bD`

The private key and mnemonic are stored locally under `secure/wallets/` with owner-only file permissions. The wallet was imported into MetaMask in the current Chrome profile as `polymarket开发者`.
