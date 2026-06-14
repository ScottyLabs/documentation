#!/usr/bin/env bash
# Dispatch a repository_dispatch event to the documentation hub.
# Usage: DOCS_TRIGGER_TOKEN=... dispatch-rebuild.sh <event_type>
# Example event types: governance-updated, docs-updated, diagrams-updated

set -euo pipefail

EVENT_TYPE="${1:?event type required (e.g. governance-updated)}"
TOKEN="${DOCS_TRIGGER_TOKEN:?DOCS_TRIGGER_TOKEN must be set}"
API_BASE="${FORGEJO_API_BASE:-https://codeberg.org/api/v1}"
TARGET_REPO="${DOCS_TARGET_REPO:-scottylabs/documentation}"

curl -fsS -X POST \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "${API_BASE}/repos/${TARGET_REPO}/dispatches" \
  -d "{\"event_type\":\"${EVENT_TYPE}\"}"

echo "Dispatched ${EVENT_TYPE} to ${TARGET_REPO}"
