#!/usr/bin/env bash
# Nightly weave for Gooddaynight.
# Schedule this Nebius Serverless Job for 21:00 in Amy's timezone.
#
# The Token Factory call happens inside POST /api/weave (Nemotron Super).
# This script is the job entrypoint: it authenticates with WEAVE_CRON_SECRET
# and weaves every email-unlocked vault that has captures today.
set -euo pipefail

: "${APP_URL:?Set APP_URL to the deployed origin, e.g. https://gooddaynight.com}"
: "${WEAVE_CRON_SECRET:?Set WEAVE_CRON_SECRET to the same value as the app env}"

DAY="${1:-$(date +%F)}"

curl -fsS -X POST "$APP_URL/api/weave" \
  -H "Authorization: Bearer $WEAVE_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"day\":\"$DAY\"}"
echo
