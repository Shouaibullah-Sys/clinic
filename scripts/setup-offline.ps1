param(
  [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envExample = Join-Path $projectRoot ".env.offline.example"
$envLocal = Join-Path $projectRoot ".env.local"

Write-Host "Preparing offline Windows setup..."

if (-not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "Created .env.local from .env.offline.example"
} else {
  Write-Host ".env.local already exists. Leaving it unchanged."
}

Write-Host ""
Write-Host "Prerequisites:"
Write-Host "1. Install Node.js LTS"
Write-Host "2. Install pnpm"
Write-Host "3. Install MongoDB Community Server"
Write-Host "4. Ensure MongoDB is running on mongodb://127.0.0.1:27017"

if ($InstallDependencies) {
  pnpm install
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "- Update .env.local secrets if needed"
Write-Host "- Run scripts\\start-offline.ps1"

