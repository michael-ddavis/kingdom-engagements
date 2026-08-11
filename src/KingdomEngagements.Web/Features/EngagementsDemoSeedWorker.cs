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
                await SeedAssignmentsAsync(engagements, stoppingToken);
                await SeedRequestsAsync(requests, engagements, stoppingToken);
                logger.LogInformation("Kingdom Engagements demo assignments and invitations are ready.");
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
            Assignment("assignment-demo-003", "Apostolic Leadership Intensive", "Cynthia Thompson", "Kingdom Embassy", "Samuel Price", "samuel@kingdomembassy.example", "Dallas, Texas", 55, 57, "planning", "open", "in-progress", "not-started", "confirmed", "requested", "not-started", "A larger leadership intensive with several coordination items still open.",
                Task("travel", "Select outbound flight", "Engagement Coordinator", "open", 30, "Prioritize an arrival that leaves margin before the first leader session."),
                Task("lodging", "Confirm hotel reservation", "Host Coordinator", "in-progress", 32, "Host is finalizing the hotel confirmation."),
                Task("documents", "Receive leadership intensive agenda", "Host Organization", "open", 28, "Need the complete session grid and ministry expectations.")),
            Assignment("assignment-demo-004", "Regional Pastors Gathering", "Cynthia Thompson", "Covenant Worship Center", "Rachel Morgan", "rachel@covenantworship.example", "Richmond, Virginia", 12, 12, "planning", "confirmed", "confirmed", "confirmed", "confirmed", "confirmed", "not-started", "A nearby one-day assignment with strong readiness and a simple travel plan.",
                Task("host", "Confirm pastoral roundtable topics", "Host Organization", "complete", 4, "Roundtable topics received and reviewed."),
                Task("travel", "Confirm ground travel window", "Engagement Coordinator", "complete", 6, "Local departure and return windows confirmed.")),
            Assignment("assignment-demo-005", "Global Intercessors Convocation", "Cynthia Thompson", "The Well Fellowship", "Monica Hayes", "monica@thewell.example", "Orlando, Florida", 74, 76, "planning", "not-started", "not-started", "not-started", "in-progress", "requested", "not-started", "Early-stage assignment. Host coordination has begun but travel has not been selected.",
                Task("host", "Clarify prayer ministry expectations", "Engagement Coordinator", "in-progress", 48, "Confirm altar ministry, intercession blocks, and leadership prayer expectations."),
                Task("travel", "Build travel options", "Engagement Coordinator", "open", 52, "Prepare flight options after the schedule is finalized.")),
            Assignment("assignment-demo-006", "Marketplace Kingdom Forum", "Cynthia Thompson", "CityGate Network", "Andre Lewis", "andre@citygate.example", "Washington, DC", 95, 96, "planning", "not-started", "not-started", "not-started", "confirmed", "not-started", "not-started", "Forum invitation is approved; detailed coordination begins closer to the event.",
                Task("host", "Confirm panel format", "Host Organization", "open", 66, "Confirm keynote, panel, and executive-session responsibilities."),
                Task("documents", "Collect event audience brief", "Engagement Coordinator", "open", 70, "Request audience profile and partner list.")),
            Assignment("assignment-demo-007", "Daughters Arise Conference", "Cynthia Thompson", "Living Waters Assembly", "Nicole Carter", "nicole@livingwaters.example", "Baltimore, Maryland", -18, -16, "complete", "complete", "complete", "complete", "complete", "received", "complete", "Completed assignment with responses and closeout finished for demo history.",
                Task("closeout", "Send host thank-you", "Engagement Coordinator", "complete", -14, "Thank-you and final follow-up sent."),
                Task("closeout", "Archive final documents", "Engagement Coordinator", "complete", -13, "Final records reviewed and retained.")),
            Assignment("assignment-demo-008", "Leadership Renewal Weekend", "Cynthia Thompson", "New Life Ministries", "Peter Collins", "peter@newlife.example", "Nashville, Tennessee", -45, -43, "complete", "complete", "complete", "complete", "complete", "received", "complete", "Completed weekend retained to demonstrate historical assignments and ministry records.",
                Task("closeout", "Complete ministry notes", "Engagement Coordinator", "complete", -40, "Ministry notes and follow-up outcomes recorded."),
                Task("documents", "Archive signed agreement", "Engagement Coordinator", "complete", -39, "Signed agreement retained with the assignment."))
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
        EngagementsDbContext engagements,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var assignmentIds = await engagements.Assignments.AsNoTracking()
            .Where(x => x.TenantId == KingdomIdentity.DemoTenantId)
            .ToDictionaryAsync(x => x.ExternalAssignmentId, x => x.Id, ct);
        var seeds = new[]
        {
            Request("CTG-DEMO-001", "River City Church", "Kingdom Builders Conference", "Conference", "Alexis Monroe", "alexis@rivercity.example", "Richmond", "Virginia", 104, 105, 900, "awaiting-review", "proposed", "not-started", "not-due", null, null, 15),
            Request("CTG-DEMO-002", "Fresh Wind Ministries", "Prophetic Worship Encounter", "Worship gathering", "Isaiah Cole", "isaiah@freshwind.example", "Raleigh", "North Carolina", 82, 82, 650, "information-needed", "proposed", "drafted", "not-due", null, null, 25),
            Request("CTG-DEMO-003", "New Covenant Fellowship", "Kingdom Leadership Gathering", "Leadership gathering", "Jordan Ellis", "jordan@newcovenant.example", "Atlanta", "Georgia", 21, 23, 1200, "approved", "scheduled", "signed", "pending", "assignment-demo-001", null, 72),
            Request("CTG-DEMO-004", "Hope City Network", "Fall Leadership Retreat", "Retreat", "Maya Bennett", "maya@hopecity.example", "Savannah", "Georgia", 68, 70, 450, "declined", "cancelled", "not-started", "not-applicable", null, "The requested dates conflict with an existing ministry assignment.", 0),
            Request("CTG-DEMO-005", "Kingdom Life Center", "Women in Ministry Luncheon", "Luncheon", "Tanya Roberts", "tanya@kingdomlife.example", "Norfolk", "Virginia", 46, 46, 325, "awaiting-review", "proposed", "not-started", "not-due", null, null, 10),
            Request("CTG-DEMO-006", "The Gathering Church", "Citywide Prayer Summit", "Prayer summit", "David Foster", "david@thegathering.example", "Columbia", "South Carolina", 61, 62, 800, "information-needed", "proposed", "drafted", "not-due", null, null, 35),
            Request("CTG-DEMO-007", "Grace City Church", "Women of Purpose Summit", "Conference", "Danielle Brooks", "danielle@gracecity.example", "Charlotte", "North Carolina", 38, 40, 1500, "approved", "scheduled", "signed", "paid", "assignment-demo-002", null, 90),
            Request("CTG-DEMO-008", "Dominion Fellowship", "Next Generation Leaders Forum", "Leadership forum", "Chris Walker", "chris@dominion.example", "Philadelphia", "Pennsylvania", 118, 119, 700, "awaiting-review", "proposed", "not-started", "not-due", null, null, 5)
        };

        foreach (var seed in seeds)
        {
            if (await requests.Requests.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.ReferenceNumber == seed.Reference, ct))
                continue;

            var submitted = now.AddDays(seed.StartDays > 0 ? -Math.Min(14, seed.StartDays / 4) : -60);
            var record = new SpeakingRequestRecord
            {
                Id = Guid.NewGuid(),
                TenantId = KingdomIdentity.DemoTenantId,
                ReferenceNumber = seed.Reference,
                EditToken = $"demo-{seed.Reference.ToLowerInvariant().Replace("-", string.Empty)}",
                EditTokenExpiresAtUtc = seed.Status == "information-needed" ? now.AddDays(7) : null,
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
                TravelCoverageStatus = seed.Status == "approved" ? "yes" : "not-determined",
                LodgingCoverageStatus = seed.Status == "approved" ? "yes" : "not-determined",
                HonorariumStatus = seed.Status == "declined" ? "not-determined" : "yes",
                TravelBookedBy = seed.Status == "approved" ? "host" : "not-determined",
                HonorariumAmount = seed.Status == "declined" ? 0 : 1500,
                HonorariumCurrency = "USD",
                PaymentStatus = seed.PaymentStatus,
                AgreementStatus = seed.AgreementStatus,
                EngagementStatus = seed.EngagementStatus,
                ReadinessPercentage = seed.Readiness,
                Status = seed.Status,
                DeclineReason = seed.DeclineReason,
                AssignmentId = seed.AssignmentExternalId is not null && assignmentIds.TryGetValue(seed.AssignmentExternalId, out var assignmentId) ? assignmentId : null,
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
            if (seed.Status == "information-needed")
            {
                record.Communications.Add(new SpeakingRequestCommunicationRecord
                {
                    Id = Guid.NewGuid(),
                    RequestId = record.Id,
                    Type = "information-requested",
                    Message = "Please confirm the final schedule, travel expectations, and ministry format.",
                    Actor = "Engagement Coordinator",
                    CreatedAtUtc = submitted.AddDays(2)
                });
            }
            else if (seed.Status == "approved")
            {
                record.Communications.Add(new SpeakingRequestCommunicationRecord
                {
                    Id = Guid.NewGuid(),
                    RequestId = record.Id,
                    Type = "approved",
                    Message = "The invitation was approved and moved into assignment coordination.",
                    Actor = "Engagement Coordinator",
                    CreatedAtUtc = submitted.AddDays(3)
                });
            }
            else if (seed.Status == "declined")
            {
                record.Communications.Add(new SpeakingRequestCommunicationRecord
                {
                    Id = Guid.NewGuid(),
                    RequestId = record.Id,
                    Type = "declined",
                    Message = seed.DeclineReason ?? "The invitation was declined.",
                    Actor = "Engagement Coordinator",
                    CreatedAtUtc = submitted.AddDays(2)
                });
            }
            requests.Requests.Add(record);
        }

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
        "assignment-demo-003" => [new("Agreement draft", "agreement", "received"), new("Leadership intensive agenda", "host", "requested")],
        "assignment-demo-004" => [new("Event schedule", "host", "received"), new("Travel plan", "travel", "received")],
        "assignment-demo-005" => [new("Host questionnaire", "host", "requested")],
        "assignment-demo-006" => [new("Forum brief", "host", "requested")],
        "assignment-demo-007" => [new("Signed agreement", "agreement", "received"), new("Final ministry report", "closeout", "received")],
        _ => [new("Signed agreement", "agreement", "received"), new("Final itinerary", "travel", "received")]
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
