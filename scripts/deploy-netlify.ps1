# ---------------------------------------------------------------------------
# Automated Netlify Deploy Script.
#
# Reads .env, pushes environment variables to Netlify, builds and deploys.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
    throw ".env file not found."
}

Write-Host "==> Pushing environment variables to Netlify..." -ForegroundColor Cyan

Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $key = $line.Substring(0, $line.IndexOf("=")).Trim()
        $val = $line.Substring($line.IndexOf("=") + 1).Trim().Trim('"')
        if ($key -and $val) {
            Write-Host "    + $key" -ForegroundColor Green
            npx --yes netlify env:set $key $val 2>$null
        }
    }
}

Write-Host "==> Building and deploying to Netlify production..." -ForegroundColor Cyan
npx --yes netlify deploy --build --prod

Write-Host "==> Deployment Complete!" -ForegroundColor Green
