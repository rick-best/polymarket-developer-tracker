#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p logs reports

if npm run email:status --silent | grep -q '"liveReady": true'; then
  npm run email:send
else
  echo "$(date '+%Y-%m-%dT%H:%M:%S%z') live email config incomplete; running dry-run report instead"
  npm run email:dry
fi
