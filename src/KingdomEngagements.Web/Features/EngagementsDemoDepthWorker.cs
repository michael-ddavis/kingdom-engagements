using System.Text;
using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementsDemoDepthWorker(
    IServiceScopeFactory scopeFactory,
    EngagementsStartupState startup,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    ILogger<EngagementsDemoDepthWorker> logger) : BackgroundService
{
    private static readonly Guid MalikResponseId = Guid.Parse("3d7ec5de-38f0-42c8-928b-27a01bb11043");
    private static readonly Guid ReneeResponseId = Guid.Parse("68421985-e6b0-49cf-bd43-8b9022c11045");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!environment.IsDevelopment() || !configuration.GetValue("KingdomOS:DemoData:Enabled", true)) return;

        while (!stoppingToken.IsCancellationRequested && !startup.Ready)
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        for (var attempt = 1; attempt <= 20 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var engagements = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                var requests = scope.ServiceProvider.GetRequiredService<SpeakingRequestsDbContext>();
                var preparations = scope.ServiceProvider.GetRequiredService<EngagementPreparationDbContext>();
                var activities = scope.ServiceProvider.GetRequiredService<AssignmentWorkspaceDbContext>();
                var completion = scope.ServiceProvider.GetRequiredService<EngagementCompletionDbContext>();

                await requests.EnsureSchemaAsync(stoppingToken);
                await preparations.EnsureSchemaAsync(stoppingToken);
                await activities.EnsureSchemaAsync(stoppingToken);
                await completion.EnsureSchemaAsync(stoppingToken);

                await SeedDepthAsync(engagements, requests, preparations, activities, completion, stoppingToken);
                logger.LogInformation("Kingdom Engagements demo preparation, activity, response, and closeout data are ready.");
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception)
            {
                var delay = TimeSpan.FromSeconds(Math.Min(15, Math.Max(2, attempt)));
                logger.LogWarning(exception, "Engagements demo depth seed attempt {Attempt} failed. Retrying in {DelaySeconds} seconds.", attempt, delay.TotalSeconds);
                await Task.Delay(delay, stoppingToken);
            }
        }
    }

    private static async Task SeedDepthAsync(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        EngagementPreparationDbContext preparations,
        AssignmentWorkspaceDbContext activities,
        EngagementCompletionDbContext completion,
        CancellationToken ct)
    {
        var assignments = await engagements.Assignments
            .Include(x => x.Tasks)
            .Include(x => x.Documents)
            .Where(x => x.TenantId == KingdomIdentity.DemoTenantId && x.ExternalAssignmentId.StartsWith("assignment-demo-"))
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync(ct);
        if (assignments.Count == 0) return;

        var speakingRequests = await requests.Requests
            .Where(x => x.TenantId == KingdomIdentity.DemoTenantId)
            .ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;

        foreach (var assignment in assignments)
        {
            var start = assignment.StartsAtUtc ?? now.AddDays(30);
            var end = assignment.EndsAtUtc ?? start;
            var hostName = string.IsNullOrWhiteSpace(assignment.HostContactName) ? "Host Coordinator" : assignment.HostContactName;
            var hostEmail = string.IsNullOrWhiteSpace(assignment.HostContactEmail) ? "host@example.com" : assignment.HostContactEmail;
            var request = speakingRequests.FirstOrDefault(x => x.AssignmentId == assignment.Id);
            var prep = await preparations.Preparations
                .SingleOrDefaultAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.AssignmentId == assignment.Id, ct);

            if (prep is null)
            {
                var travel = TravelFor(assignment);
                var submitted = assignment.Status == "complete" || assignment.ExternalAssignmentId is "assignment-demo-001" or "assignment-demo-002" or "assignment-demo-004";
                prep = new EngagementPreparationRecord
                {
                    Id = Guid.NewGuid(), TenantId = KingdomIdentity.DemoTenantId, AssignmentId = assignment.Id,
                    RequestId = request?.Id ?? Guid.NewGuid(),
                    ReferenceNumber = request?.ReferenceNumber ?? $"CTG-{assignment.ExternalAssignmentId.Replace("assignment-demo-", "ASSIGN-")}",
                    EventName = assignment.Title, EventType = request?.EventType ?? "Ministry assignment", HostOrganization = assignment.HostOrganization,
                    EventStartDate = DateOnly.FromDateTime(start.UtcDateTime), EventEndDate = DateOnly.FromDateTime(end.UtcDateTime),
                    TermsToken = $"terms-{Guid.NewGuid():N}", TermsTokenExpiresAtUtc = start.AddDays(30), TermsStatus = "accepted",
                    TermsAcceptedAtUtc = now.AddDays(-12), TermsAcceptedByName = hostName, TermsAcceptedByEmail = hostEmail,
                    TermsAcceptanceNote = "Terms reviewed and accepted for the ministry assignment.",
                    TravelCoverageStatus = "yes", LodgingCoverageStatus = "yes", TravelBookedBy = "host", HonorariumStatus = "yes",
                    HonorariumAmount = request?.HonorariumAmount > 0 ? request.HonorariumAmount : 1500m,
                    HonorariumCurrency = request?.HonorariumCurrency ?? "USD", PaymentStatus = assignment.Status == "complete" ? "paid" : "pending",
                    CoordinationToken = $"coord-{Guid.NewGuid():N}", CoordinationTokenExpiresAtUtc = start.AddDays(30),
                    CoordinationStatus = submitted ? "submitted" : "in-progress",
                    OutboundAirline = "Delta", OutboundFlightNumber = travel.OutboundFlight, OutboundConfirmationNumber = travel.Confirmation,
                    OutboundDepartureAirport = "RIC", OutboundArrivalAirport = travel.Airport,
                    OutboundDepartsAtUtc = start.AddDays(-1).AddHours(-6), OutboundArrivesAtUtc = start.AddDays(-1).AddHours(-4),
                    ReturnAirline = "Delta", ReturnFlightNumber = travel.ReturnFlight, ReturnConfirmationNumber = travel.Confirmation,
                    ReturnDepartureAirport = travel.Airport, ReturnArrivalAirport = "RIC",
                    ReturnDepartsAtUtc = end.AddDays(1).AddHours(3), ReturnArrivesAtUtc = end.AddDays(1).AddHours(5),
                    HotelName = travel.Hotel, HotelAddress = travel.HotelAddress, HotelConfirmationNumber = $"HTL-{travel.Confirmation}",
                    HotelCheckInAtUtc = start.AddDays(-1).AddHours(-2), HotelCheckOutAtUtc = end.AddDays(1).AddHours(-1),
                    TransportationPlan = "Host transportation team will handle airport pickup, hotel transfers, venue arrival, and return airport transportation.",
                    PickupContactName = hostName, PickupContactPhone = "(804) 555-0142",
                    ScheduleJson = JsonSerializer.Serialize(new[]
                    {
                        new HostScheduleItemInput("Arrival & host welcome", DateOnly.FromDateTime(start.UtcDateTime), "4:00 PM", "4:30 PM", travel.Hotel, "Check-in and host welcome."),
                        new HostScheduleItemInput("Leadership prayer & briefing", DateOnly.FromDateTime(start.UtcDateTime), "6:00 PM", "6:45 PM", assignment.HostOrganization, "Prayer, room review, and ministry expectations."),
                        new HostScheduleItemInput(assignment.Title, DateOnly.FromDateTime(start.UtcDateTime), "7:00 PM", "9:00 PM", assignment.HostOrganization, "Primary ministry session."),
                        new HostScheduleItemInput("Host debrief", DateOnly.FromDateTime(end.UtcDateTime), "12:00 PM", "12:30 PM", assignment.HostOrganization, "Final host follow-up and next steps.")
                    }),
                    ContactsJson = JsonSerializer.Serialize(new[]
                    {
                        new HostContactInput("primary", hostName, hostEmail, "(804) 555-0142"),
                        new HostContactInput("travel", "Morgan Reed", "travel@host.example", "(804) 555-0188"),
                        new HostContactInput("media", "Taylor Brooks", "media@host.example", "(804) 555-0163"),
                        new HostContactInput("emergency", "Pastor On Call", "care@host.example", "(804) 555-0199")
                    }),
                    PromotionRequirements = "Use the approved speaker photo and bio. Confirm final service times before publishing event graphics.",
                    PrayerFocus = "Pray for clarity, strengthening of leaders, healing, and a faithful response to what God is doing in the room.",
                    HostNotes = "Green room will be available one hour before ministry. Water and a light meal will be prepared.",
                    SubmittedAtUtc = submitted ? now.AddDays(-5) : null, CreatedAtUtc = now.AddDays(-14), UpdatedAtUtc = now.AddHours(-6)
                };
                preparations.Preparations.Add(prep);
                await preparations.SaveChangesAsync(ct);
            }

            if (!await preparations.Documents.AnyAsync(x => x.PreparationId == prep.Id, ct))
            {
                var itinerary = Encoding.UTF8.GetBytes($"{assignment.Title}\nTravel itinerary\nOutbound: {prep.OutboundAirline} {prep.OutboundFlightNumber} RIC → {prep.OutboundArrivalAirport}\nReturn: {prep.ReturnAirline} {prep.ReturnFlightNumber} {prep.ReturnDepartureAirport} → RIC\nHotel: {prep.HotelName}");
                preparations.Documents.Add(new HostCoordinationDocumentRecord { Id = Guid.NewGuid(), PreparationId = prep.Id, FileName = "Travel-Itinerary.txt", ContentType = "text/plain", Length = itinerary.LongLength, Content = itinerary, UploadedAtUtc = now.AddDays(-4) });
                var brief = Encoding.UTF8.GetBytes($"Assignment brief\n{assignment.Title}\nHost: {assignment.HostOrganization}\nLocation: {assignment.Location}\nPrayer focus: {prep.PrayerFocus}");
                preparations.Documents.Add(new HostCoordinationDocumentRecord { Id = Guid.NewGuid(), PreparationId = prep.Id, FileName = "Assignment-Brief.txt", ContentType = "text/plain", Length = brief.LongLength, Content = brief, UploadedAtUtc = now.AddDays(-3) });
                await preparations.SaveChangesAsync(ct);
            }

            if (!await activities.Activities.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.AssignmentId == assignment.Id, ct))
            {
                activities.Activities.AddRange(
                    Activity(assignment.Id, "terms-accepted", "Engagement terms accepted", $"{hostName} accepted the engagement terms.", "Host organization", now.AddDays(-12)),
                    Activity(assignment.Id, "coordination-updated", "Travel and host details updated", "Flights, lodging, transportation, schedule, and contacts were added to the assignment.", "Engagement Coordinator", now.AddDays(-7)),
                    Activity(assignment.Id, "document-uploaded", "Assignment documents received", "Travel itinerary and assignment brief were added to the record.", "Host Coordinator", now.AddDays(-4)),
                    Activity(assignment.Id, "readiness-reviewed", "Preparation readiness reviewed", assignment.Status == "complete" ? "Assignment preparation and closeout are complete." : "The ministry team reviewed remaining preparation items.", "Engagement Coordinator", now.AddHours(-8)));
            }

            if (assignment.Status == "complete") await SeedCompletionAsync(completion, assignment, now, ct);
        }

        await activities.SaveChangesAsync(ct);
        await completion.SaveChangesAsync(ct);
    }

    private static async Task SeedCompletionAsync(EngagementCompletionDbContext completion, EngagementAssignment assignment, DateTimeOffset now, CancellationToken ct)
    {
        if (!await completion.Responses.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.AssignmentId == assignment.Id, ct))
        {
            completion.Responses.AddRange(
                Response(assignment.Id, "prayer-request", 18, false, null, "Prayer response was strong throughout the final ministry time.", now.AddDays(-2)),
                Response(assignment.Id, "recommitment", 7, false, null, "Seven people indicated a recommitment response.", now.AddDays(-2)),
                Response(assignment.Id, "discipleship", 4, true, "Pastoral Care Team", "Four people requested a discipleship connection. Follow-up was completed with the host church.", now.AddDays(-2), completed: true),
                Response(assignment.Id, "healing-testimony", 3, false, null, "Three testimonies were submitted after the gathering.", now.AddDays(-1)));
        }

        // These named handoffs make the cross-module Care story visible and stable on
        // both fresh and preserved demo databases. Their IDs are also used by Care.
        if (!await completion.Responses.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.Id == MalikResponseId, ct))
        {
            completion.Responses.Add(PersonResponse(
                MalikResponseId,
                assignment.Id,
                "Malik Robinson",
                "malik.robinson@example.com",
                "(804) 555-0143",
                "pastoral-follow-up",
                "Requested a personal call and a trusted local church connection after the gathering.",
                now.AddDays(-2)));
        }

        if (!await completion.Responses.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.Id == ReneeResponseId, ct))
        {
            completion.Responses.Add(PersonResponse(
                ReneeResponseId,
                assignment.Id,
                "Renee Walker",
                "renee.walker@example.com",
                "(404) 555-0188",
                "discipleship",
                "Asked for a discipleship pathway and ongoing pastoral follow-up.",
                now.AddDays(-1)));
        }

        if (!await completion.Closeouts.AnyAsync(x => x.TenantId == KingdomIdentity.DemoTenantId && x.AssignmentId == assignment.Id, ct))
        {
            completion.Closeouts.Add(new EngagementCloseoutRecord
            {
                Id = Guid.NewGuid(), TenantId = KingdomIdentity.DemoTenantId, AssignmentId = assignment.Id,
                EventNotes = "The host team was prepared, the ministry schedule stayed on time, and the response period was handled with pastoral care.",
                TestimonySummary = "Leaders reported renewed clarity and several attendees requested prayer, discipleship, and ongoing connection.",
                HostFollowUpComplete = true, HostFollowUpNotes = "Thank-you and ministry recap sent to the host. No unresolved host concerns remain.",
                FinalDocumentsComplete = true, PaymentComplete = true, AdministrativeFollowUpComplete = true, OutcomesRecorded = true,
                CompletedAtUtc = now.AddDays(-1), UpdatedAtUtc = now.AddDays(-1)
            });
        }
    }

    private static AssignmentWorkspaceActivityRecord Activity(Guid assignmentId, string kind, string title, string detail, string actor, DateTimeOffset occurred) => new()
    {
        Id = Guid.NewGuid(), TenantId = KingdomIdentity.DemoTenantId, AssignmentId = assignmentId, Kind = kind, Title = title, Detail = detail, Actor = actor, OccurredAtUtc = occurred
    };

    private static MinistryResponseRecord Response(Guid assignmentId, string type, int count, bool followUp, string? owner, string notes, DateTimeOffset created, bool completed = false) => new()
    {
        Id = Guid.NewGuid(), TenantId = KingdomIdentity.DemoTenantId, AssignmentId = assignmentId, Type = type, Count = count,
        Notes = notes, RequiresFollowUp = followUp, FollowUpStatus = followUp ? completed ? "completed" : "needs-follow-up" : "not-required",
        FollowUpOwner = owner, FollowUpDueAtUtc = followUp ? created.AddDays(3) : null,
        FollowUpNotes = completed ? "Follow-up completed and documented with the host care team." : null,
        FollowUpCompletedAtUtc = completed ? created.AddDays(2) : null, CreatedAtUtc = created, UpdatedAtUtc = completed ? created.AddDays(2) : created
    };

    private static MinistryResponseRecord PersonResponse(
        Guid id,
        Guid assignmentId,
        string personName,
        string email,
        string phone,
        string type,
        string notes,
        DateTimeOffset created) => new()
    {
        Id = id,
        TenantId = KingdomIdentity.DemoTenantId,
        AssignmentId = assignmentId,
        Type = type,
        Count = 1,
        PersonName = personName,
        Email = email,
        Phone = phone,
        Notes = notes,
        RequiresFollowUp = true,
        FollowUpStatus = "completed",
        FollowUpOwner = "Kingdom Care",
        FollowUpDueAtUtc = created.AddDays(2),
        FollowUpNotes = "Consent confirmed. Responsibility transferred to Kingdom Care.",
        FollowUpCompletedAtUtc = created.AddHours(3),
        CreatedAtUtc = created,
        UpdatedAtUtc = created.AddHours(3)
    };

    private static TravelSeed TravelFor(EngagementAssignment assignment)
    {
        var location = assignment.Location ?? string.Empty;
        return location switch
        {
            var value when value.Contains("Atlanta", StringComparison.OrdinalIgnoreCase) => new("ATL", "DL2174", "DL2175", "KLG7A2", "Hyatt Regency Atlanta", "265 Peachtree St NE, Atlanta, GA"),
            var value when value.Contains("Charlotte", StringComparison.OrdinalIgnoreCase) => new("CLT", "DL2310", "DL2309", "WPS8C4", "JW Marriott Charlotte", "600 S College St, Charlotte, NC"),
            var value when value.Contains("Dallas", StringComparison.OrdinalIgnoreCase) => new("DFW", "DL0821", "DL0828", "ALI9D5", "Omni Dallas Hotel", "555 S Lamar St, Dallas, TX"),
            var value when value.Contains("Richmond", StringComparison.OrdinalIgnoreCase) => new("RIC", "GROUND", "GROUND", "RPG2V6", "The Jefferson Hotel", "101 W Franklin St, Richmond, VA"),
            var value when value.Contains("Orlando", StringComparison.OrdinalIgnoreCase) => new("MCO", "DL1284", "DL1291", "GIC4F7", "Hyatt Regency Orlando", "9801 International Dr, Orlando, FL"),
            var value when value.Contains("Washington", StringComparison.OrdinalIgnoreCase) => new("DCA", "GROUND", "GROUND", "MKF6H8", "Grand Hyatt Washington", "1000 H St NW, Washington, DC"),
            var value when value.Contains("Baltimore", StringComparison.OrdinalIgnoreCase) => new("BWI", "DL1462", "DL1467", "DAC3J9", "Baltimore Marriott Waterfront", "700 Aliceanna St, Baltimore, MD"),
            _ => new("BNA", "DL1197", "DL1202", "LRW5K1", "Omni Nashville Hotel", "250 Rep. John Lewis Way S, Nashville, TN")
        };
    }

    private sealed record TravelSeed(string Airport, string OutboundFlight, string ReturnFlight, string Confirmation, string Hotel, string HotelAddress);
}
