# ---------------------------------------------------------------------------
# One-shot Vercel deploy.
#
# Reads .env, pushes every variable to the Vercel project, then deploys to
# production. Run it from the project root:
#
#     npx vercel login          # once, opens your browser
#     ./scripts/deploy-vercel.ps1
#
# Re-running is safe: existing variables are removed and re-added.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
    throw ".env not found. Copy .env.example to .env and fill it in first."
}

Write-Host "==> Linking the Vercel project..." -ForegroundColor Cyan
npx vercel link --yes

# Variables that must exist on the server. NEXT_PUBLIC_APP_URL is set after the
# first deploy, once the domain is known.
$skip = @("NEXT_PUBLIC_APP_URL")

Write-Host "==> Pushing environment variables..." -ForegroundColor Cyan
foreach ($line in Get-Content ".env") {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) { continue }

    $name = $trimmed.Substring(0, $trimmed.IndexOf("=")).Trim()
    $value = $trimmed.Substring($trimmed.IndexOf("=") + 1).Trim().Trim('"')

    if ($skip -contains $name) { continue }
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "    - $name (empty, skipped)" -ForegroundColor DarkGray
        continue
    }

    foreach ($target in @("production", "preview", "development")) {
        # Remove first so re-runs update rather than fail on a duplicate.
        npx vercel env rm $name $target --yes 2>$null | Out-Null
        $value | npx vercel env add $name $target 2>$null | Out-Null
    }
    Write-Host "    + $name" -ForegroundColor Green
}

Write-Host "==> Deploying to production..." -ForegroundColor Cyan
npx vercel --prod

Write-Host ""
Write-Host "Done. One last step:" -ForegroundColor Yellow
Write-Host "  Set NEXT_PUBLIC_APP_URL to the deployed domain, then redeploy:" -ForegroundColor Yellow
Write-Host '    "https://<your-domain>" | npx vercel env add NEXT_PUBLIC_APP_URL production' -ForegroundColor Yellow
Write-Host "    npx vercel --prod" -ForegroundColor Yellow
