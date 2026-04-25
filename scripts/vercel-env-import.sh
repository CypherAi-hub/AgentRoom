#!/usr/bin/env bash
# Reads .env.local and pipes each production-relevant variable into
# `vercel env add` for the production, preview, and development scopes.
#
# Prereqs:
#   1. npm i -g vercel   (or use npx vercel)
#   2. vercel login
#   3. vercel link       (run from this repo root, link to your project)
#
# Usage:
#   bash scripts/vercel-env-import.sh           # add only (errors if exists)
#   bash scripts/vercel-env-import.sh --replace # remove existing first
#
# Skips legacy hybrid-integration vars and any commented/blank lines.

set -euo pipefail

ENV_FILE=".env.local"
TARGETS=(production preview development)
REPLACE=false

if [[ "${1:-}" == "--replace" ]]; then
  REPLACE=true
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  $ENV_FILE not found. Run from repo root." >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌  vercel CLI not found. Install with: npm i -g vercel" >&2
  exit 1
fi

# Vars that are local-only or no longer used in production code.
SKIP_VARS=(
  GITHUB_TOKEN
  GITHUB_OWNER
  GITHUB_REPOS
  VERCEL_TOKEN
  VERCEL_TEAM_ID
  VERCEL_PROJECT_IDS
  NEXT_PUBLIC_APP_MODE
)

is_skipped() {
  local key="$1"
  for skip in "${SKIP_VARS[@]}"; do
    [[ "$skip" == "$key" ]] && return 0
  done
  return 1
}

count_added=0
count_skipped=0

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue        # blank
  [[ "$line" =~ ^[[:space:]]*# ]] && continue        # comment
  [[ "$line" != *=* ]] && continue                   # malformed

  key="${line%%=*}"
  value="${line#*=}"
  key="$(echo -n "$key" | tr -d '[:space:]')"

  if [[ -z "$value" ]]; then
    echo "↪  skip (empty):  $key"
    count_skipped=$((count_skipped + 1))
    continue
  fi

  if is_skipped "$key"; then
    echo "↪  skip (legacy): $key"
    count_skipped=$((count_skipped + 1))
    continue
  fi

  for env in "${TARGETS[@]}"; do
    if [[ "$REPLACE" == "true" ]]; then
      vercel env rm "$key" "$env" --yes >/dev/null 2>&1 || true
    fi
    printf '%s' "$value" | vercel env add "$key" "$env" >/dev/null 2>&1 \
      && echo "✅ $key → $env" \
      || echo "⚠️  $key → $env (already exists; rerun with --replace to overwrite)"
  done
  count_added=$((count_added + 1))
done < "$ENV_FILE"

echo
echo "Done. Processed $count_added vars (skipped $count_skipped)."
echo "Verify with: vercel env ls"
