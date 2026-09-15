$ErrorActionPreference = 'Stop'
$sourceRoot = $PSScriptRoot
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Port 3000 is already in use. Open http://localhost:3000 or stop that server before restarting.'
    exit
}
$runtimeRoot = Join-Path (Join-Path $env:LOCALAPPDATA 'PeiwanLocal') (Split-Path $sourceRoot -Leaf)
New-Item -ItemType Directory -Force $runtimeRoot | Out-Null
foreach ($name in @('app','lib','scripts','data','tests','.github')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $name) -Destination $runtimeRoot -Recurse -Force
}
foreach ($name in @('package.json','package-lock.json','tsconfig.json','.env.example','.gitignore','next-env.d.ts')) {
    $file = Join-Path $sourceRoot $name
    if (Test-Path -LiteralPath $file) { Copy-Item -LiteralPath $file -Destination $runtimeRoot -Force }
}
if (!(Test-Path -LiteralPath (Join-Path $runtimeRoot '.env.local'))) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot '.env.example') -Destination (Join-Path $runtimeRoot '.env.local')
}
Set-Location -LiteralPath $runtimeRoot
$installState = Join-Path $runtimeRoot '.runtime/install-hash'
$lockHash = (Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash
$previousHash = if (Test-Path -LiteralPath $installState) { (Get-Content -LiteralPath $installState -Raw).Trim() } else { '' }
if (!(Test-Path -LiteralPath 'node_modules/next/package.json') -or $previousHash -ne $lockHash) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    New-Item -ItemType Directory -Force (Join-Path $runtimeRoot '.runtime') | Out-Null
    Set-Content -LiteralPath $installState -Value $lockHash
} else {
    Write-Host 'Dependencies are up to date.'
}
$nodePath = (Get-Command node.exe).Source
$dbPort = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if (!$dbPort) {
    $dbProcess = Start-Process -FilePath $nodePath -ArgumentList 'scripts/db.mjs' -WorkingDirectory $runtimeRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'db.log') -RedirectStandardError (Join-Path $runtimeRoot 'db-error.log')
    $dbProcess.Id | Set-Content (Join-Path $runtimeRoot 'db.pid')
    Write-Host 'Starting MongoDB (first run downloads the server)...'
    $ready = $false
    for ($i=0; $i -lt 300; $i++) {
        if (Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue) { $ready=$true; break }
        if ($dbProcess.HasExited) { throw "MongoDB stopped. Read $runtimeRoot/db-error.log" }
        Start-Sleep -Seconds 2
    }
    if (!$ready) { throw 'MongoDB did not start. Check db-error.log.' }
}
& npm.cmd run seed
if ($LASTEXITCODE -ne 0) { throw 'Sample import failed' }
Write-Host 'Open http://localhost:3000 . Press Ctrl+C to stop the webpage.'
& npm.cmd run dev
