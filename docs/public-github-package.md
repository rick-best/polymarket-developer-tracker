# Public GitHub Package

Last updated: 2026-05-25

Purpose: define what can be published to a public GitHub repository for Polymarket Builder Program review without exposing local credentials, operational notes, wallet secrets, server details, or private automation state.

## Public Repository Goal

The public repository should prove that this is an active Polymarket ecosystem developer project:

- Static Builder Profile Site.
- Read-only official source collectors.
- Market Intelligence dashboard.
- Community Intel dashboard.
- API Examples Kit and compatibility checker work.
- Safety guardrails against fake volume, wallet-draining flows, and misleading claims.

## Include

- `README.md`
- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `src/`
- `scripts/`
- `site/`
- `docs/builder-submission-package.md`
- `docs/community-intelligence.md`
- `docs/developer-plan.md`
- `docs/ecosystem-roadmap.md`
- `docs/market-intel-dashboard.md`
- `docs/public-builder-profile-site.md`
- `docs/blocker-agent.md`
- `data/official-links.json`
- `data/community-intel-observations.json`
- `automation/*.example`
- `wallets/README.md`

## Exclude

- `.env` and any env file with real values.
- `secure/`
- `logs/`
- `reports/`
- `node_modules/`
- `.codex/`
- `AGENTS.md`
- `PROJECT_STATUS.md`
- `NEXT_ACTION_QUEUE.md`
- `docs/deployment.md`
- `data/execution-state.json`
- `data/blocker-agent-latest.json`
- wallet JSON/key/pem/txt files.
- tarballs, zips, or generated deployment bundles.

## Before Publishing

1. Run `git status --short --ignored`.
2. Confirm sensitive files are ignored.
3. Run `npm run verify`.
4. Create the public GitHub repository only after user confirms the target account/repo name.
5. Push only the sanitized local Git state.
6. Add the public GitHub URL to `docs/builder-submission-package.md`.

## Submission Note

The public GitHub URL and public Website URL should be submitted through the official Builders Program form only after final user confirmation. Do not submit private keys, mnemonics, SMTP secrets, Builder API key values, or Polymarket API keys to GitHub.
