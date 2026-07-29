#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-shot Vercel deploy (macOS / Linux / Git Bash).
#
#     npx vercel login          # once, opens your browser
#     ./scripts/deploy-vercel.sh
#
# Re-running is safe: existing variables are removed and re-added.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo ".env not found. Copy .env.example to .env first."; exit 1; }

echo "==> Linking the Vercel project..."
npx vercel link --yes

echo "==> Pushing environment variables..."
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  case "$line" in *=*) ;; *) continue ;; esac

  name="${line%%=*}"
  value="${line#*=}"
  name="$(echo "$name" | xargs)"
  value="$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/^"//' -e 's/"$//')"

  # Set after the first deploy, once the domain is known.
  [ "$name" = "NEXT_PUBLIC_APP_URL" ] && continue
  [ -z "$value" ] && { echo "    - $name (empty, skipped)"; continue; }

  for target in production preview development; do
    npx vercel env rm "$name" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | npx vercel env add "$name" "$target" >/dev/null 2>&1 || true
  done
  echo "    + $name"
done < .env

echo "==> Deploying to production..."
npx vercel --prod

cat <<'EOF'

Done. One last step:
  Set NEXT_PUBLIC_APP_URL to the deployed domain, then redeploy:
    printf 'https://<your-domain>' | npx vercel env add NEXT_PUBLIC_APP_URL production
    npx vercel --prod
EOF
