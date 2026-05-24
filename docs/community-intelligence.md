# Polymarket Community Intelligence Workflow

This workflow turns public Polymarket developer/community signals into local development priorities without posting, trading, wallet signing, or unsafe link handling.

## Sources

- Official Docs: `https://docs.polymarket.com/` and `https://docs.polymarket.com/llms.txt`
- Official GitHub: `https://github.com/Polymarket`
- Official X: `https://x.com/Polymarket`
- Builders X: `https://x.com/PolymarketBuild`
- Official Discord: `https://discord.gg/polymarket`
- Official Telegram: `https://t.me/polymarket`

X, Discord, and Telegram are read-only research channels by default. Posting, joining restricted channels, account changes, form submission, or clicking unverified crypto links requires explicit user confirmation at action time.

## Runbook

1. Run `npm run community:intel`.
2. Review `reports/community-intel-latest.txt` and `site/community-intel/index.html`.
3. Treat third-party X/Reddit/forum posts as demand signals only.
4. Before relying on any link, confirm it is an official domain or can be reached from an official Polymarket source record.
5. Convert high-scoring signals into local low-risk work: docs, dashboards, reports, read-only collectors, examples, and safety checks.

## Priority Mapping

- API/docs/community complaints -> API Examples Kit and docs compatibility checks.
- Builder leaderboard and Builder Data API signals -> Public Builder Profile Site and Builder Tracker hardening.
- Official X market launches and Rewards changes -> Market Intelligence dashboard deltas.
- Discord/TG developer questions -> local support notes or response drafts, not live posts.
- Scam, wallet, API-key, or auth confusion -> Risk & Compliance Monitor.

## Current Limits

- Continuous X search is blocked unless a connector or `TWITTER_TOKEN` is available.
- Discord and Telegram require logged-in account/browser state for current channel reads.
- No community activity is counted as complete unless there is local evidence or a user-confirmed external action.

## Night Echo/X Automation

Codex automation `polymarket-night-echo-x-intel` runs locally during the Beijing-time 02:00-06:00 window. It is allowed to use the user's logged-in Chrome/Echo/X surfaces for read-only search and evidence capture.

Allowed:

- Search official `@Polymarket`, `@PolymarketBuild`, developer/API/CLOB/Builder/rewards/community keywords, and visible official/community pages.
- Save concise observations, URLs, confidence labels, blockers, and local development priorities.
- Update project-local reports/status/queue files.

Not allowed without fresh action-time confirmation:

- Posting, liking, replying, following, joining restricted channels, submitting forms, creating API keys, connecting wallets, signing, trading, depositing, withdrawing, or clicking unverified crypto links.
