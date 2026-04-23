param(
  [string]$SourceUri = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if ($SourceUri -ne "") {
  $env:EXPORT_MONGODB_URI = $SourceUri
}

pnpm run db:export:full

