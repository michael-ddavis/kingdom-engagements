param(
    [string]$BaseUrl = "http://localhost:5110"
)

$ErrorActionPreference = "Stop"
$ApostleHeaders = @{ "X-Kingdom-Engagements-Demo-Role" = "apostle" }

function Assert-Status {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    try {
        & $Action | Out-Null
        Write-Host "PASS  $Name" -ForegroundColor Green
    }
    catch {
        Write-Host "FAIL  $Name" -ForegroundColor Red
        throw
    }
}

Write-Host "`nApostolOS Engagements — Wednesday demo verification" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl`n"

Assert-Status "Engagements health endpoint" {
    $health = Invoke-RestMethod "$BaseUrl/health"
    if ($health.module -ne "engagements") { throw "Unexpected health payload." }
}

Assert-Status "Apostle Cynthia executive dashboard route" {
    $response = Invoke-WebRequest "$BaseUrl/organization/ctg/apostle" -UseBasicParsing
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch "<app-root") {
        throw "Executive route did not return the Angular shell."
    }
}

$assignments = Invoke-RestMethod "$BaseUrl/api/engagements/assignments" -Headers $ApostleHeaders
if (-not $assignments -or $assignments.Count -eq 0) {
    throw "No engagements were returned for the Apostle Cynthia role."
}
$assignment = $assignments | Select-Object -First 1
$assignmentId = $assignment.id

Assert-Status "Apostle Cynthia can read engagement summaries" {
    if (-not $assignmentId) { throw "No engagement id was returned." }
}

Assert-Status "Executive engagement brief route" {
    $response = Invoke-WebRequest "$BaseUrl/organization/ctg/apostle/engagements/$assignmentId" -UseBasicParsing
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch "<app-root") {
        throw "Executive engagement brief route did not return the Angular shell."
    }
}

Assert-Status "Apostle Cynthia can read the existing engagement" {
    $detail = Invoke-RestMethod "$BaseUrl/api/engagements/assignments/$assignmentId" -Headers $ApostleHeaders
    if ($detail.summary.id -ne $assignmentId) { throw "Wrong engagement returned." }
}

Assert-Status "Apostle Cynthia can read collaboration/readiness data" {
    $workspace = Invoke-RestMethod "$BaseUrl/api/engagements/assignments/$assignmentId/workspace" -Headers $ApostleHeaders
    if (-not $workspace.workspace.readiness) { throw "Workspace readiness was not returned." }
}

Assert-Status "Apostle Cynthia remains read-only" {
    $payload = @{
        externalAssignmentId = "blocked-wednesday-write"
        title = "This should never be created"
        speakerName = "Cynthia Thompson"
        hostOrganization = "Blocked Demo Host"
        startsAtUtc = $null
        endsAtUtc = $null
        location = $null
    } | ConvertTo-Json

    try {
        Invoke-WebRequest "$BaseUrl/api/engagements/assignments" `
            -Method Post `
            -Headers $ApostleHeaders `
            -ContentType "application/json" `
            -Body $payload `
            -UseBasicParsing | Out-Null
        throw "The Apostle role unexpectedly received write access."
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -ne 403) { throw "Expected 403 for Apostle write attempt, received $status." }
    }
}

Assert-Status "Public host terms page remains available" {
    $response = Invoke-WebRequest "$BaseUrl/host/terms/not-a-real-token" -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw "Host terms shell is unavailable." }
}

Assert-Status "Public host coordination page remains available" {
    $response = Invoke-WebRequest "$BaseUrl/host/coordination/not-a-real-token" -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw "Host coordination shell is unavailable." }
}

Write-Host "`nAUTOMATED CHECKS PASSED.`n" -ForegroundColor Green
Write-Host "Final 5-minute click rehearsal:" -ForegroundColor Cyan
Write-Host "  1. Demo as Apostle Cynthia → visual dashboard loads with city imagery/fallbacks."
Write-Host "  2. Click Next Assignment → executive brief, not the operational workspace."
Write-Host "  3. Back to my overview → returns to Cynthia's dashboard."
Write-Host "  4. Demo as Coordinator → Booking Desk → convert/open an engagement."
Write-Host "  5. Open Host Collaboration → save host progress → refresh/verify same engagement updates."
Write-Host "  6. Switch back to Apostle Cynthia → confirm the high-level picture still reads cleanly."
Write-Host "`nAfter this passes, treat demo-ready as BUG-FIX ONLY until Wednesday.`n" -ForegroundColor Yellow
