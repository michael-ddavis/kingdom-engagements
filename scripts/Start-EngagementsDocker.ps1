param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required but was not found on PATH."
    }
}

function Stop-NativeEngagementsProcesses {
    param([string]$RepoRoot)

    $escapedRoot = [Regex]::Escape($RepoRoot)
    $processes = Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -and
            (
                $_.Name -match "KingdomEngagements" -or
                $_.CommandLine -match $escapedRoot
            )
        }

    foreach ($process in $processes) {
        Write-Host "Stopping old native Engagements process $($process.ProcessId) ($($process.Name))..."
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Assert-Command "docker"
Assert-Command "node"
Assert-Command "npm"

$engagementsRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reposRoot = Split-Path $engagementsRoot -Parent
$infrastructureRoot = Join-Path $reposRoot "kingdom-infrastructure"
$platformRoot = Join-Path $reposRoot "kingdom-platform"
$operationsRoot = Join-Path $reposRoot "kingdom-operations"

foreach ($requiredPath in @($infrastructureRoot, $platformRoot, $operationsRoot)) {
    if (-not (Test-Path $requiredPath)) {
        throw "Required KingdomOS repository was not found: $requiredPath"
    }
}

Write-Host ""
Write-Host "KingdomOS Docker startup"
Write-Host "Repos root: $reposRoot"
Write-Host "Modules: operations, engagements"
Write-Host ""

try {
    docker version | Out-Null
}
catch {
    throw "Docker Desktop is not ready. Start Docker Desktop and run this command again."
}

Stop-NativeEngagementsProcesses -RepoRoot $engagementsRoot

$env:KINGDOM_REPOS_ROOT = $reposRoot

Push-Location $infrastructureRoot
try {
    Write-Host "Rebuilding KingdomOS Platform + Operations + Engagements..."
    Write-Host ""

    npm run kingdom -- up --modules operations,engagements

    if ($LASTEXITCODE -ne 0) {
        throw "KingdomOS Docker startup failed."
    }

    Write-Host ""
    Write-Host "Docker status:"
    npm run kingdom -- status --modules operations,engagements
}
finally {
    Pop-Location
}

$platformUrl = "http://localhost:5100"
$engagementsUrl = "http://localhost:5110/organization/ctg/command-center"

Write-Host ""
Write-Host "KingdomOS is running in Docker."
Write-Host "Platform:           $platformUrl"
Write-Host "Courtney Command:   $engagementsUrl"
Write-Host "Operations:         http://localhost:5101"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $engagementsUrl
}
