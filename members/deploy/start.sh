#!/usr/bin/env bash
# Runs the web server and the cron jobs in one machine, since both need the
# same volume. If either stops, exit so Fly restarts the machine.
set -euo pipefail
cd /app

supercronic deploy/crontab &
node_modules/.bin/tsx src/server/index.ts &

trap 'kill -TERM $(jobs -p) 2>/dev/null; wait' INT TERM
wait -n
kill -TERM $(jobs -p) 2>/dev/null || true
exit 1
