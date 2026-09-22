param(
    [int]$FrontendStartPort = 4210,
    [int]$BackendStartPort = 5112,
    [switch]$SkipPull
)

$ErrorActionPreference = "Stop"

function Get-FreePort {
    param([int]$StartPort)

    $port = $StartPort
    while ($true) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        if (-not $listener) {
            return $port
        }
        $port++
    }
}

function Stop-KingdomEngagementsProcesses {
    param([string]$RepoRoot)

    $escapedRoot = [Regex]::Escape($RepoRoot)

    $processes = Get-CimInstance Win32_Process |
        Where-Object {
            ($_.Name -match "KingdomEngagements") -or
            ($_.CommandLine -and $_.CommandLine -match $escapedRoot)
        }

    foreach ($process in $processes) {
        Write-Host "Stopping old Engagements process $($process.ProcessId) ($($process.Name))..."
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$web = Join-Path $repoRoot "src\KingdomEngagements.Web"
$client = Join-Path $web "ClientApp"
$proxyPath = Join-Path $client "proxy.local.conf.json"
$logDirectory = Join-Path $repoRoot ".local-logs"

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

if (-not $SkipPull) {
    Push-Location $repoRoot
    try {
        git checkout style/ctg-arck-smooth-banner
        git pull origin style/ctg-arck-smooth-banner
    }
    finally {
        Pop-Location
    }
}

Stop-KingdomEngagementsProcesses -RepoRoot $repoRoot

$backendPort = Get-FreePort -StartPort $BackendStartPort
$frontendPort = Get-FreePort -StartPort $FrontendStartPort

$proxyJson = @"
{
  "/api": {
    "target": "http://localhost:$backendPort",
    "secure": false,
    "changeOrigin": true
  }
}
"@

Set-Content -Path $proxyPath -Value $proxyJson -Encoding UTF8

$backendOut = Join-Path $logDirectory "backend.out.log"
$backendErr = Join-Path $logDirectory "backend.err.log"
$frontendOut = Join-Path $logDirectory "frontend.out.log"
$frontendErr = Join-Path $logDirectory "frontend.err.log"

Remove-Item $backendOut,$backendErr,$frontendOut,$frontendErr -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting Kingdom Engagements..."
Write-Host "Backend:  http://localhost:$backendPort"
Write-Host "Frontend: http://localhost:$frontendPort"
Write-Host ""

$backendArgs = @(
    "watch",
    "run",
    "--project",
    $web,
    "--urls",
    "http://localhost:$backendPort"
)

$backendProcess = Start-Process -FilePath "dotnet" -ArgumentList $backendArgs -WorkingDirectory $web -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -PassThru

if (-not (Test-Path (Join-Path $client "node_modules"))) {
    Write-Host "Installing Angular dependencies..."
    Push-Location $client
    try {
        npm.cmd install
    }
    finally {
        Pop-Location
    }
}

$frontendArgs = @(
    "ng",
    "serve",
    "--port",
    "$frontendPort",
    "--proxy-config",
    "proxy.local.conf.json"
)

$frontendProcess = Start-Process -FilePath "npx.cmd" -ArgumentList $frontendArgs -WorkingDirectory $client -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr -PassThru

Write-Host "Waiting for the backend..."

$backendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1

    if ($backendProcess.HasExited) {
        break
    }

    try {
        $headers = @{ "X-Kingdom-Engagements-Demo-Role" = "coordinator" }
        $null = Invoke-RestMethod -Uri "http://localhost:$backendPort/api/engagements/assignments" -Headers $headers -TimeoutSec 2
        $backendReady = $true
        break
    }
    catch {
        Write-Host "." -NoNewline
    }
}

Write-Host ""

if (-not $backendReady) {
    Write-Host "The backend did not become ready."
    Write-Host ""
    Write-Host "Backend error log:"
    if (Test-Path $backendErr) {
        Get-Content $backendErr -Tail 40
    }
    Write-Host ""
    Write-Host "Backend output log:"
    if (Test-Path $backendOut) {
        Get-Content $backendOut -Tail 40
    }
    exit 1
}

Write-Host "Backend is ready."
Write-Host "Waiting for Angular..."

$frontendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1

    if ($frontendProcess.HasExited) {
        break
    }

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -UseBasicParsing -TimeoutSec 2

        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $frontendReady = $true
            break
        }
    }
    catch {
        Write-Host "." -NoNewline
    }
}

Write-Host ""

if (-not $frontendReady) {
    Write-Host "Angular did not become ready."
    Write-Host ""
    Write-Host "Frontend error log:"
    if (Test-Path $frontendErr) {
        Get-Content $frontendErr -Tail 40
    }
    Write-Host ""
    Write-Host "Frontend output log:"
    if (Test-Path $frontendOut) {
        Get-Content $frontendOut -Tail 40
    }
    exit 1
}

$commandCenterUrl = "http://localhost:$frontendPort/organization/ctg/command-center"

Write-Host ""
Write-Host "Kingdom Engagements is running."
Write-Host "Command Center: $commandCenterUrl"
Write-Host ""
Write-Host "Backend PID:  $($backendProcess.Id)"
Write-Host "Frontend PID: $($frontendProcess.Id)"
Write-Host ""
Write-Host "Logs:"
Write-Host "  $backendOut"
Write-Host "  $backendErr"
Write-Host "  $frontendOut"
Write-Host "  $frontendErr"
Write-Host ""

Start-Process $commandCenterUrl
