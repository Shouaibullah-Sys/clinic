param(
  [string]$TargetUri = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if ($TargetUri -ne "") {
  $env:IMPORT_MONGODB_URI = $TargetUri
}

$env:ALLOW_DESTRUCTIVE_IMPORT = "true"
pnpm run db:import:full

