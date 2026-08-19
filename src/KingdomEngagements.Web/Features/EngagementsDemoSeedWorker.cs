using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementsDemoSeedWorker(
    IServiceScopeFactory scopeFactory,
    EngagementsStartupState startup,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    ILogger<EngagementsDemoSeedWorker> logger) : BackgroundService
{
    private static readonly string[] RetainedAssignmentIds =
    [
        "assignment-demo-001",
        "assignment-demo-002",
        "assignment-demo-007"
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!environment.IsDevelopment() || !configuration.GetValue("KingdomOS:DemoData:Enabled", true))
            return;

        while (!stoppingToken.IsCancellationRequested && !startup.Ready)
            await System.Threading.Tasks.Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        for (var attempt = 1; attempt <= 20 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var engagements = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                var requests = scope.ServiceProvider.GetRequiredService<SpeakingRequestsDbContext>();
                await requests.EnsureSchemaAsync(stoppingToken);

                await RemoveRetiredSourceRowsAsync(engagements, requests, stoppingToken);
                await SeedAssignmentsAsync(engagements, stoppingToken);
                await SeedRequestsAsync(requests, stoppingToken);
                await RemoveRetiredSourceRowsAsync(engagements, requests, stoppingToken);

                logger.LogInformation(
                    "Kingdom Engagements focused demo data is ready: three assignments and one incoming invitation.");
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(15, Math.Max(2, attempt)));
                logger.LogWarning(exception,
                    "Engagements demo seed attempt {Attempt} failed. Retrying in {DelaySeconds} seconds.",
                    attempt,
                    delay.TotalSeconds);
                await System.Threading.Tasks.Task.Delay(delay, stoppingToken);
            }
        }
    }

    private static async Task RemoveRetiredSourceRowsAsync(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        CancellationToken ct)
    {
        var retiredRequests = await requests.Requests
            .Include(x => x.Communications)
            .Where(x =>
                x.TenantId == KingdomIdentity.DemoTenantId &&
                ((x.ReferenceNumber.StartsWith("CTG-DEMO-") && x.ReferenceNumber != "CTG-DEMO-001") ||
                 x.EventName.StartsWith("Demo-lock Engagement") ||
                 x.OrganizationName == "Demo-lock Covenant Fellowship"))
            .ToListAsync(ct);
        if (retiredRequests.Count > 0)
        {
            requests.Requests.RemoveRange(retiredRequests);
            await requests.SaveChangesAsync(ct);
        }

        var retiredAssignments = await engagements.Assignments
            .Include(x => x.Tasks)
            .Include(x => x.Documents)
            .Where(x =>
                x.TenantId == KingdomIdentity.DemoTenantId &&
                ((x.ExternalAssignmentId.StartsWith("assignment-demo-") && !RetainedAssignmentIds.Contains(x.ExternalAssignmentId)) ||
                 x.Title.StartsWith("Demo-lock Engagement") ||
                 x.HostOrganization == "Demo-lock Covenant Fellowship"))
            .ToListAsync(ct);
        if (retiredAssignments.Count > 0)
        {
            engagements.Assignments.RemoveRange(retiredAssignments);
            await engagements.SaveChangesAsync(ct);
        }
    }

    private static async Task SeedAssignmentsAsync(EngagementsDbContext db, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var seeds = new[]
        {
            Assignment("assignment-demo-001", "Kingdom Leadership Gathering", "Cynthia Thompson", "New Covenant Fellowship", "Jordan Ellis", "jordan@newcovenant.example", "Atlanta, Georgia", 21, 23, "planning", "in-progress", "confirmed", "needs-attention", "confirmed", "in-progress", "not-started", "Host logistics are moving. Airport pickup and the final itinerary still need attention.",
                Task("travel", "Confirm flight itinerary", "Engagement Coordinator", "in-progress", 7, "Confirm final flight numbers and arrival time."),
                Task("transportation", "Confirm airport pickup", "Host Coordinator", "open", 12, "Name the driver and confirm pickup instructions."),
                Task("host", "Approve final event schedule", "Host Organization", "complete", 5, "Final platform and service times approved.")),
            Assignment("assignment-demo-002", "Women of Purpose Summit", "Cynthia Thompson", "Grace City Church", "Danielle Brooks", "danielle@gracecity.example", "Charlotte, North Carolina", 38, 40, "planning", "confirmed", "confirmed", "confirmed", "confirmed", "received", "not-started", "Travel, lodging, and host coordination are confirmed. Final ministry-preparation items remain.",
                Task("documents", "Review final event brief", "Engagement Coordinator", "open", 24, "Review audience profile, ministry focus, and final host notes."),
                Task("host", "Confirm green room schedule", "Host Coordinator", "complete", 20, "Green room and pre-service prayer timing confirmed.")),
            Assignment("assignment-demo-007", "Daughters Arise Conference", "Cynthia Thompson", "Living Waters Assembly", "Nicole Carter", "nicole@livingwaters.example", "Baltimore, Maryland", -18, -16, "complete", "complete", "complete", "complete", "complete", "received", "complete", "Completed assignment with responses and closeout finished for demo history.",
                Task("closeout", "Send host thank-you", "Engagement Coordinator", "complete", -14, "Thank-you and final follow-up sent."),
                Task("closeout", "Archive final documents", "Engagement Coordinator", "complete", -13, "Final records reviewed and retained."))
        };

        foreach (var seed in seeds)
        {
            var existing = await db.Assignments
                .Include(x => x.Tasks)
                .Include(x => x.Documents)
                .SingleOrDefaultAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.ExternalAssignmentId == seed.ExternalId, ct);

            if (existing is null)
            {
                existing = new EngagementAssignment
                {
                    Id = Guid.NewGuid(),
                    TenantId = KingdomIdentity.DemoTenantId,
                    ExternalAssignmentId = seed.ExternalId,
                    Title = seed.Title,
                    SpeakerName = seed.Speaker,
                    HostOrganization = seed.Host,
                    HostContactName = seed.ContactName,
                    HostContactEmail = seed.ContactEmail,
                    Location = seed.Location,
                    StartsAtUtc = now.AddDays(seed.StartDays),
                    EndsAtUtc = now.AddDays(seed.EndDays),
                    Status = seed.Status,
                    TravelStatus = seed.TravelStatus,
                    LodgingStatus = seed.LodgingStatus,
                    TransportationStatus = seed.TransportationStatus,
                    HostStatus = seed.HostStatus,
                    DocumentsStatus = seed.DocumentsStatus,
                    CloseoutStatus = seed.CloseoutStatus,
                    Notes = seed.Notes,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };
                db.Assignments.Add(existing);
            }

            foreach (var taskSeed in seed.Tasks)
            {
                if (existing.Tasks.Any(x => string.Equals(x.Category, taskSeed.Category, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(x.Title, taskSeed.Title, StringComparison.OrdinalIgnoreCase))) continue;
                existing.Tasks.Add(new EngagementTask
                {
                    Id = Guid.NewGuid(),
                    Category = taskSeed.Category,
                    Title = taskSeed.Title,
                    Owner = taskSeed.Owner,
                    Status = taskSeed.Status,
                    Detail = taskSeed.Detail,
                    DueAtUtc = now.AddDays(taskSeed.DueDays),
                    UpdatedAtUtc = now
                });
            }

            foreach (var document in DocumentsFor(seed.ExternalId))
            {
                if (existing.Documents.Any(x => string.Equals(x.Name, document.Name, StringComparison.OrdinalIgnoreCase))) continue;
                existing.Documents.Add(new EngagementDocument
                {
                    Id = Guid.NewGuid(),
                    Name = document.Name,
                    Category = document.Category,
                    Status = document.Status,
                    UpdatedAtUtc = now
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedRequestsAsync(
        SpeakingRequestsDbContext requests,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var seed = Request(
            "CTG-DEMO-001",
            "River City Church",
            "Kingdom Builders Conference",
            "Conference",
            "Alexis Monroe",
            "alexis@rivercity.example",
            "Richmond",
            "Virginia",
            104,
            105,
            900,
            "awaiting-review",
            "proposed",
            "not-started",
            "not-due",
            null,
            null,
            15);

        if (await requests.Requests.AnyAsync(
                x => x.TenantId == KingdomIdentity.DemoTenantId && x.ReferenceNumber == seed.Reference,
                ct))
            return;

        var submitted = now.AddDays(-Math.Min(14, seed.StartDays / 4));
        var record = new SpeakingRequestRecord
        {
            Id = Guid.NewGuid(),
            TenantId = KingdomIdentity.DemoTenantId,
            ReferenceNumber = seed.Reference,
            EditToken = $"demo-{seed.Reference.ToLowerInvariant().Replace("-", string.Empty)}",
            OrganizationName = seed.Organization,
            EventName = seed.EventName,
            EventType = seed.EventType,
            ContactName = seed.ContactName,
            ContactEmail = seed.ContactEmail,
            ContactPhone = "(804) 555-01" + seed.Reference[^2..],
            City = seed.City,
            State = seed.State,
            Country = "United States",
            Region = "United States",
            TimeZone = "America/New_York",
            VenueAddress = $"{100 + seed.Readiness} Ministry Way",
            VenueName = seed.Organization,
            StartDate = DateOnly.FromDateTime(now.UtcDateTime.AddDays(seed.StartDays)),
            EndDate = DateOnly.FromDateTime(now.UtcDateTime.AddDays(seed.EndDays)),
            MinistryRequest = $"Invite Cynthia Thompson to minister at {seed.EventName}, with emphasis on leadership, prayer, formation, and Kingdom impact.",
            ExpectedAttendance = seed.Attendance,
            TravelCoverageStatus = "not-determined",
            LodgingCoverageStatus = "not-determined",
            HonorariumStatus = "yes",
            TravelBookedBy = "not-determined",
            HonorariumAmount = 1500,
            HonorariumCurrency = "USD",
            PaymentStatus = seed.PaymentStatus,
            AgreementStatus = seed.AgreementStatus,
            EngagementStatus = seed.EngagementStatus,
            ReadinessPercentage = seed.Readiness,
            Status = seed.Status,
            DeclineReason = seed.DeclineReason,
            AssignmentId = null,
            SubmittedAtUtc = submitted,
            UpdatedAtUtc = now
        };
        record.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = record.Id,
            Type = "submitted",
            Message = "Speaking invitation submitted for ministry-team review.",
            Actor = record.ContactName,
            CreatedAtUtc = submitted
        });
        requests.Requests.Add(record);
        await requests.SaveChangesAsync(ct);
    }

    private static AssignmentSeed Assignment(
        string externalId,
        string title,
        string speaker,
        string host,
        string contactName,
        string contactEmail,
        string location,
        int startDays,
        int endDays,
        string status,
        string travelStatus,
        string lodgingStatus,
        string transportationStatus,
        string hostStatus,
        string documentsStatus,
        string closeoutStatus,
        string notes,
        params TaskSeed[] tasks) => new(externalId, title, speaker, host, contactName, contactEmail, location, startDays, endDays, status, travelStatus, lodgingStatus, transportationStatus, hostStatus, documentsStatus, closeoutStatus, notes, tasks);

    private static TaskSeed Task(string category, string title, string owner, string status, int dueDays, string detail) =>
        new(category, title, owner, status, dueDays, detail);

    private static RequestSeed Request(
        string reference,
        string organization,
        string eventName,
        string eventType,
        string contactName,
        string contactEmail,
        string city,
        string state,
        int startDays,
        int endDays,
        int attendance,
        string status,
        string engagementStatus,
        string agreementStatus,
        string paymentStatus,
        string? assignmentExternalId,
        string? declineReason,
        int readiness) => new(reference, organization, eventName, eventType, contactName, contactEmail, city, state, startDays, endDays, attendance, status, engagementStatus, agreementStatus, paymentStatus, assignmentExternalId, declineReason, readiness);

    private static DocumentSeed[] DocumentsFor(string externalId) => externalId switch
    {
        "assignment-demo-001" => [new("Speaker agreement", "agreement", "received"), new("Final itinerary", "travel", "requested")],
        "assignment-demo-002" => [new("Signed agreement", "agreement", "received"), new("Event brief", "host", "received")],
        "assignment-demo-007" => [new("Signed agreement", "agreement", "received"), new("Final ministry report", "closeout", "received")],
        _ => []
    };

    private sealed record AssignmentSeed(
        string ExternalId, string Title, string Speaker, string Host, string ContactName, string ContactEmail,
        string Location, int StartDays, int EndDays, string Status, string TravelStatus, string LodgingStatus,
        string TransportationStatus, string HostStatus, string DocumentsStatus, string CloseoutStatus,
        string Notes, TaskSeed[] Tasks);
    private sealed record TaskSeed(string Category, string Title, string Owner, string Status, int DueDays, string Detail);
    private sealed record DocumentSeed(string Name, string Category, string Status);
    private sealed record RequestSeed(
        string Reference, string Organization, string EventName, string EventType, string ContactName, string ContactEmail,
        string City, string State, int StartDays, int EndDays, int Attendance, string Status, string EngagementStatus,
        string AgreementStatus, string PaymentStatus, string? AssignmentExternalId, string? DeclineReason, int Readiness);
}
