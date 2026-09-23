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
        "assignment-demo-003",
        "assignment-demo-004",
        "assignment-demo-005",
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
                var tenantAccessor = scope.ServiceProvider.GetRequiredService<ICurrentTenantAccessor>();
                using var tenantScope = tenantAccessor.BeginTenant(
                    KingdomIdentity.DemoTenantId,
                    "seed development-only Engagements demo data");
                var engagements = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                var requests = scope.ServiceProvider.GetRequiredService<SpeakingRequestsDbContext>();
                await requests.EnsureSchemaAsync(stoppingToken);

                await RemoveRetiredSourceRowsAsync(engagements, requests, stoppingToken);
                await SeedAssignmentsAsync(engagements, stoppingToken);
                await SeedRequestsAsync(requests, stoppingToken);
                await RemoveRetiredSourceRowsAsync(engagements, requests, stoppingToken);

                logger.LogInformation(
                    "Kingdom Engagements executive demo data is ready: five upcoming assignments, one completed assignment, and one incoming invitation.");
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
            Assignment("assignment-demo-001", "Kingdom Leadership Gathering", "Cynthia Thompson", "New Covenant Fellowship", "Jordan Ellis", "jordan@newcovenant.example", "Atlanta, Georgia", 5, 7, "planning", "in-progress", "confirmed", "needs-attention", "confirmed", "in-progress", "not-started", "The Atlanta assignment is next. Most preparation is complete; final travel confirmation and the last itinerary details are still moving.",
                Task("travel", "Confirm outbound itinerary", "Engagement Coordinator", "complete", 1, "Outbound flight and arrival window confirmed."),
                Task("lodging", "Confirm hotel reservation", "Engagement Coordinator", "complete", 1, "Hotel reservation and check-in notes confirmed."),
                Task("host", "Approve final event schedule", "Host Organization", "complete", 2, "Final platform and service times approved."),
                Task("documents", "Receive speaker brief", "Engagement Coordinator", "complete", 2, "Speaker brief and ministry focus received."),
                Task("transportation", "Assign airport pickup", "Host Coordinator", "complete", 3, "Primary driver assigned for airport pickup."),
                Task("host", "Confirm venue details", "Host Coordinator", "complete", 3, "Venue access and arrival instructions confirmed."),
                Task("ministry", "Review prayer focus", "Ministry Team", "complete", 4, "Prayer focus reviewed with the ministry team."),
                Task("travel", "Final travel confirmation", "Engagement Coordinator", "open", 4, "Confirm final flight numbers and pickup handoff.")),
            Assignment("assignment-demo-002", "Women of Purpose Summit", "Cynthia Thompson", "Grace City Church", "Danielle Brooks", "danielle@gracecity.example", "Charlotte, North Carolina", 11, 13, "planning", "confirmed", "confirmed", "confirmed", "confirmed", "received", "not-started", "Charlotte is fully prepared and ready for ministry.",
                Task("travel", "Confirm flight itinerary", "Engagement Coordinator", "complete", 3, "Travel itinerary confirmed."),
                Task("lodging", "Confirm lodging", "Engagement Coordinator", "complete", 4, "Lodging confirmed."),
                Task("transportation", "Confirm ground transportation", "Host Coordinator", "complete", 5, "Ground transportation confirmed."),
                Task("host", "Approve host schedule", "Host Organization", "complete", 6, "Host schedule approved."),
                Task("documents", "Receive final event brief", "Engagement Coordinator", "received", 7, "Final event brief received.")),
            Assignment("assignment-demo-003", "Global Church Summit", "Cynthia Thompson", "Kingdom Life London", "Rachel Morgan", "rachel@kingdomlife.example", "London, United Kingdom", 18, 20, "planning", "confirmed", "confirmed", "confirmed", "needs-attention", "received", "not-started", "Travel is confirmed for London. The host team is still finalizing two ministry-facing details.",
                Task("travel", "Confirm international itinerary", "Engagement Coordinator", "complete", 7, "International itinerary confirmed."),
                Task("lodging", "Confirm London lodging", "Engagement Coordinator", "complete", 8, "Lodging confirmed."),
                Task("documents", "Receive conference brief", "Engagement Coordinator", "received", 9, "Conference brief received."),
                Task("host", "Confirm final service flow", "Host Coordinator", "open", 12, "Host team is finalizing the service flow."),
                Task("host", "Confirm leadership reception", "Host Coordinator", "open", 13, "Leadership reception details are pending.")),
            Assignment("assignment-demo-004", "Rebuilders Conference", "Cynthia Thompson", "New City Fellowship", "Miriam Njoroge", "miriam@newcity.example", "Nairobi, Kenya", 24, 26, "planning", "in-progress", "confirmed", "confirmed", "confirmed", "received", "not-started", "Nairobi is on track. Travel confirmation is the primary remaining preparation item.",
                Task("lodging", "Confirm Nairobi lodging", "Engagement Coordinator", "complete", 12, "Lodging confirmed."),
                Task("host", "Approve conference schedule", "Host Organization", "complete", 14, "Conference schedule approved."),
                Task("documents", "Receive ministry brief", "Engagement Coordinator", "received", 16, "Ministry brief received."),
                Task("travel", "Finalize international ticketing", "Engagement Coordinator", "open", 18, "Final ticketing confirmation is pending.")),
            Assignment("assignment-demo-005", "Kingdom Impact Gathering", "Cynthia Thompson", "Kingdom Embassy Accra", "Abena Mensah", "abena@kingdomembassy.example", "Accra, Ghana", 29, 31, "planning", "confirmed", "confirmed", "confirmed", "confirmed", "received", "not-started", "Accra is confirmed and ready from an executive-view perspective.",
                Task("travel", "Confirm Accra itinerary", "Engagement Coordinator", "complete", 15, "Travel itinerary confirmed."),
                Task("lodging", "Confirm Accra lodging", "Engagement Coordinator", "complete", 16, "Lodging confirmed."),
                Task("transportation", "Confirm airport and venue transport", "Host Coordinator", "complete", 18, "Transportation confirmed."),
                Task("host", "Approve gathering schedule", "Host Organization", "complete", 20, "Gathering schedule approved."),
                Task("documents", "Receive final ministry packet", "Engagement Coordinator", "received", 21, "Final ministry packet received.")),
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

            // Repair the development demo on every startup so the executive dashboard
            // always reflects a useful rolling 30-day road-ahead view.
            existing.Title = seed.Title;
            existing.SpeakerName = seed.Speaker;
            existing.HostOrganization = seed.Host;
            existing.HostContactName = seed.ContactName;
            existing.HostContactEmail = seed.ContactEmail;
            existing.Location = seed.Location;
            existing.StartsAtUtc = now.AddDays(seed.StartDays);
            existing.EndsAtUtc = now.AddDays(seed.EndDays);
            existing.Status = seed.Status;
            existing.TravelStatus = seed.TravelStatus;
            existing.LodgingStatus = seed.LodgingStatus;
            existing.TransportationStatus = seed.TransportationStatus;
            existing.HostStatus = seed.HostStatus;
            existing.DocumentsStatus = seed.DocumentsStatus;
            existing.CloseoutStatus = seed.CloseoutStatus;
            existing.Notes = seed.Notes;
            existing.UpdatedAtUtc = now;

            var seededTaskKeys = seed.Tasks
                .Select(task => $"{task.Category}|{task.Title}")
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var retiredTasks = existing.Tasks
                .Where(task => !seededTaskKeys.Contains($"{task.Category}|{task.Title}"))
                .ToArray();
            if (retiredTasks.Length > 0)
                db.Tasks.RemoveRange(retiredTasks);

            foreach (var taskSeed in seed.Tasks)
            {
                var task = existing.Tasks.SingleOrDefault(x =>
                    string.Equals(x.Category, taskSeed.Category, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(x.Title, taskSeed.Title, StringComparison.OrdinalIgnoreCase));
                if (task is null)
                {
                    task = new EngagementTask { Id = Guid.NewGuid() };
                    existing.Tasks.Add(task);
                }

                task.Category = taskSeed.Category;
                task.Title = taskSeed.Title;
                task.Owner = taskSeed.Owner;
                task.Status = taskSeed.Status;
                task.Detail = taskSeed.Detail;
                task.DueAtUtc = now.AddDays(taskSeed.DueDays);
                task.UpdatedAtUtc = now;
            }

            var seededDocuments = DocumentsFor(seed.ExternalId);
            var seededDocumentNames = seededDocuments
                .Select(document => document.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var retiredDocuments = existing.Documents
                .Where(document => !seededDocumentNames.Contains(document.Name))
                .ToArray();
            if (retiredDocuments.Length > 0)
                db.Documents.RemoveRange(retiredDocuments);

            foreach (var documentSeed in seededDocuments)
            {
                var document = existing.Documents.SingleOrDefault(x =>
                    string.Equals(x.Name, documentSeed.Name, StringComparison.OrdinalIgnoreCase));
                if (document is null)
                {
                    document = new EngagementDocument { Id = Guid.NewGuid() };
                    existing.Documents.Add(document);
                }

                document.Name = documentSeed.Name;
                document.Category = documentSeed.Category;
                document.Status = documentSeed.Status;
                document.UpdatedAtUtc = now;
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

        var record = await requests.Requests
            .Include(item => item.Communications)
            .SingleOrDefaultAsync(
                item => item.TenantId == KingdomIdentity.DemoTenantId &&
                        item.ReferenceNumber == seed.Reference,
                ct);
        var submitted = now.AddDays(-Math.Min(14, seed.StartDays / 4));

        if (record is null)
        {
            record = new SpeakingRequestRecord
            {
                Id = Guid.NewGuid(),
                TenantId = KingdomIdentity.DemoTenantId,
                ReferenceNumber = seed.Reference,
                EditToken = $"demo-{seed.Reference.ToLowerInvariant().Replace("-", string.Empty)}",
                SubmittedAtUtc = submitted
            };
            requests.Requests.Add(record);
        }

        // This is the incoming invitation used to demonstrate the review decision. Repair it
        // on every development startup so a prior rehearsal or manual approval cannot leave
        // the next demo in an already-approved, partially edited, or assignment-linked state.
        record.OrganizationName = seed.Organization;
        record.EventName = seed.EventName;
        record.EventType = seed.EventType;
        record.ContactName = seed.ContactName;
        record.ContactEmail = seed.ContactEmail;
        record.ContactPhone = "(804) 555-01" + seed.Reference[^2..];
        record.City = seed.City;
        record.State = seed.State;
        record.Country = "United States";
        record.Region = "United States";
        record.TimeZone = "America/New_York";
        record.VenueAddress = $"{100 + seed.Readiness} Ministry Way";
        record.VenueName = seed.Organization;
        record.StartDate = DateOnly.FromDateTime(now.UtcDateTime.AddDays(seed.StartDays));
        record.EndDate = DateOnly.FromDateTime(now.UtcDateTime.AddDays(seed.EndDays));
        record.MinistryRequest = $"Invite Cynthia Thompson to minister at {seed.EventName}, with emphasis on leadership, prayer, formation, and Kingdom impact.";
        record.ExpectedAttendance = seed.Attendance;
        record.TravelCoverageStatus = "not-determined";
        record.LodgingCoverageStatus = "not-determined";
        record.HonorariumStatus = "yes";
        record.TravelBookedBy = "not-determined";
        record.HonorariumAmount = 1500;
        record.HonorariumCurrency = "USD";
        record.PaymentStatus = seed.PaymentStatus;
        record.AgreementStatus = seed.AgreementStatus;
        record.EngagementStatus = seed.EngagementStatus;
        record.ReadinessPercentage = seed.Readiness;
        record.Status = seed.Status;
        record.DeclineReason = seed.DeclineReason;
        record.AssignmentId = null;
        record.UpdatedAtUtc = now;

        record.Communications.Clear();
        record.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = record.Id,
            Type = "submitted",
            Message = "Speaking invitation submitted for ministry-team review.",
            Actor = record.ContactName,
            CreatedAtUtc = submitted
        });

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
        "assignment-demo-003" => [new("Signed agreement", "agreement", "received"), new("International ministry brief", "host", "received")],
        "assignment-demo-004" => [new("Signed agreement", "agreement", "received"), new("Nairobi ministry brief", "host", "received")],
        "assignment-demo-005" => [new("Signed agreement", "agreement", "received"), new("Accra ministry packet", "host", "received")],
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
