$ErrorActionPreference='Stop'
$runtimeRoot=Join-Path (Join-Path (Join-Path $env:LOCALAPPDATA 'PeiwanLocal') (Split-Path $PSScriptRoot -Leaf)) '.runtime'
if (!(Test-Path -LiteralPath $runtimeRoot)) { Write-Host 'No local database runtime found.'; exit }
Set-Content -LiteralPath (Join-Path $runtimeRoot 'stop-db') -Value 'stop'
Write-Host 'Requested a graceful MongoDB shutdown. Data files are retained.'
