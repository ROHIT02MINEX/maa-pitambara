#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Automated Netlify Deploy Script (Bash).
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo ".env file not found."; exit 1; }

echo "==> Pushing environment variables to Netlify..."
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  case "$line" in *=*) ;; *) continue ;; esac

  key="${line%%=*}"
  val="${line#*=}"
  key="$(echo "$key" | xargs)"
  val="$(echo "$val" | sed -e 's/^[[:space:]]*//' -e 's/^"//' -e 's/"$//')"

  [ -z "$val" ] && continue
  echo "    + $key"
  npx --yes netlify env:set "$key" "$val" >/dev/null 2>&1 || true
done < .env

echo "==> Building and deploying to Netlify production..."
npx --yes netlify deploy --build --prod
echo "==> Deployment Complete!"
