$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Set-Location $projectRoot
pnpm run offline:check
pnpm dev

