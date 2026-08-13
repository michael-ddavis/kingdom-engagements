using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class AssignmentWorkspaceDbContext(DbContextOptions<AssignmentWorkspaceDbContext> options) : DbContext(options)
{
    public DbSet<AssignmentWorkspaceActivityRecord> Activities => Set<AssignmentWorkspaceActivityRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var activity = modelBuilder.Entity<AssignmentWorkspaceActivityRecord>();
        activity.ToTable("EngagementAssignmentActivities");
        activity.HasKey(x => x.Id);
        activity.Property(x => x.Id).ValueGeneratedNever();
        activity.Property(x => x.Kind).HasMaxLength(60).IsRequired();
        activity.Property(x => x.Title).HasMaxLength(240).IsRequired();
        activity.Property(x => x.Detail).HasMaxLength(3000).IsRequired();
        activity.Property(x => x.Actor).HasMaxLength(180).IsRequired();
        activity.HasIndex(x => new { x.TenantId, x.AssignmentId, x.OccurredAtUtc });
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
IF OBJECT_ID(N'[dbo].[EngagementAssignmentActivities]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementAssignmentActivities] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [AssignmentId] uniqueidentifier NOT NULL,
        [Kind] nvarchar(60) NOT NULL,
        [Title] nvarchar(240) NOT NULL,
        [Detail] nvarchar(3000) NOT NULL,
        [Actor] nvarchar(180) NOT NULL,
        [OccurredAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementAssignmentActivities] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_EngagementAssignmentActivities_TenantId_AssignmentId_OccurredAtUtc]
        ON [dbo].[EngagementAssignmentActivities] ([TenantId], [AssignmentId], [OccurredAtUtc]);
END;
""";

        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class AssignmentWorkspaceActivityRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public DateTimeOffset OccurredAtUtc { get; set; }
}

public sealed record AssignmentReadinessLane(
    string Key,
    string Label,
    int Percent,
    string Status,
    string Detail);

public sealed record AssignmentReadinessRadar(
    int OverallPercent,
    string Status,
    IReadOnlyList<AssignmentReadinessLane> Lanes,
    IReadOnlyList<string> AttentionItems);

public sealed record AssignmentActivityItem(
    string Kind,
    string Title,
    string Detail,
    string Actor,
    DateTimeOffset OccurredAtUtc);

public sealed record AssignmentWorkspaceDetails(
    EngagementPreparationDetails Preparation,
    AssignmentReadinessRadar Readiness,
    IReadOnlyList<AssignmentActivityItem> Activity);

public sealed class AssignmentWorkspaceService(
    AssignmentWorkspaceDbContext activityDatabase,
    EngagementPreparationDbContext preparationDatabase,
    SpeakingRequestsDbContext requestsDatabase,
    EngagementsDbContext engagementsDatabase,
    EngagementPreparationService preparationService)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxDocumentBytes = 10 * 1024 * 1024;

    public async Task<AssignmentWorkspaceDetails?> GetAsync(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken)
    {
        await activityDatabase.EnsureSchemaAsync(cancellationToken);
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var preparation = await preparationService.EnsureAsync(tenantId, assignmentId, cancellationToken);
        if (preparation is null) return null;

        var assignment = await engagementsDatabase.Assignments.AsNoTracking()
            .Include(x => x.Tasks)
            .Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is null) return null;

        var request = await requestsDatabase.Requests.AsNoTracking()
            .Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == preparation.RequestId, cancellationToken);

        var persistedActivity = await activityDatabase.Activities.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .OrderByDescending(x => x.OccurredAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        return new AssignmentWorkspaceDetails(
            preparation,
            BuildReadiness(preparation, assignment),
            BuildActivity(preparation, assignment, request, persistedActivity));
    }

    public async Task<AssignmentWorkspaceDetails?> SaveCoordinationAsync(
        Guid tenantId,
        Guid assignmentId,
        HostCoordinationUpdate input,
        string actor,
        CancellationToken cancellationToken)
    {
        await activityDatabase.EnsureSchemaAsync(cancellationToken);
        var ensured = await preparationService.EnsureAsync(tenantId, assignmentId, cancellationToken);
        if (ensured is null) return null;

        var preparation = await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (preparation is null) return null;
        if (input.Submit && preparation.TermsStatus != "accepted")
            throw new InvalidOperationException("Accepted terms are required before the assignment can be marked prepared.");

        ValidateCoordination(input);
        ApplyCoordination(preparation, input);

        var now = DateTimeOffset.UtcNow;
        if (input.Submit)
        {
            preparation.CoordinationStatus = "submitted";
            preparation.SubmittedAtUtc = now;
        }
        else if (preparation.TermsStatus == "accepted" && preparation.CoordinationStatus != "submitted")
        {
            preparation.CoordinationStatus = "in-progress";
        }
        preparation.UpdatedAtUtc = now;
        await preparationDatabase.SaveChangesAsync(cancellationToken);
        await SyncAssignmentAsync(preparation, cancellationToken);

        await AddActivityAsync(
            tenantId,
            assignmentId,
            input.Submit ? "prepared" : "coordination-updated",
            input.Submit ? "Assignment marked prepared" : "Coordination details updated",
            input.Submit
                ? "The ministry team saved the current host preparation and marked the coordination record prepared."
                : "The ministry team updated travel, lodging, transportation, schedule, contacts, or host preparation details.",
            actor,
            now,
            cancellationToken);

        return await GetAsync(tenantId, assignmentId, cancellationToken);
    }

    public async Task<HostCoordinationDocumentDto?> AddDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string fileName,
        string contentType,
        byte[] content,
        string actor,
        CancellationToken cancellationToken)
    {
        await activityDatabase.EnsureSchemaAsync(cancellationToken);
        var ensured = await preparationService.EnsureAsync(tenantId, assignmentId, cancellationToken);
        if (ensured is null) return null;

        if (content.Length == 0) throw new ArgumentException("Choose a file to upload.");
        if (content.Length > MaxDocumentBytes) throw new ArgumentException("Assignment documents must be 10 MB or smaller.");

        var preparation = await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (preparation is null) return null;

        var now = DateTimeOffset.UtcNow;
        var safeFileName = Path.GetFileName(Required(fileName, nameof(fileName)));
        var document = new HostCoordinationDocumentRecord
        {
            Id = Guid.NewGuid(),
            PreparationId = preparation.Id,
            FileName = safeFileName,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim(),
            Length = content.LongLength,
            Content = content,
            UploadedAtUtc = now
        };
        preparationDatabase.Documents.Add(document);
        preparation.UpdatedAtUtc = now;
        await preparationDatabase.SaveChangesAsync(cancellationToken);

        var assignment = await engagementsDatabase.Assignments.Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is not null)
        {
            assignment.DocumentsStatus = "received";
            assignment.UpdatedAtUtc = now;
            if (!assignment.Documents.Any(x => x.StorageReference == $"coordination-document:{document.Id}"))
            {
                assignment.Documents.Add(new EngagementDocument
                {
                    Id = Guid.NewGuid(),
                    Name = safeFileName,
                    Category = "host-coordination",
                    Status = "received",
                    StorageReference = $"coordination-document:{document.Id}",
                    UpdatedAtUtc = now
                });
            }
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        await AddActivityAsync(
            tenantId,
            assignmentId,
            "document-uploaded",
            "Assignment document added",
            safeFileName,
            actor,
            now,
            cancellationToken);

        return new HostCoordinationDocumentDto(document.Id, document.FileName, document.ContentType, document.Length, document.UploadedAtUtc);
    }

    public async Task<bool> DeleteDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        Guid documentId,
        string actor,
        CancellationToken cancellationToken)
    {
        await activityDatabase.EnsureSchemaAsync(cancellationToken);
        await preparationDatabase.EnsureSchemaAsync(cancellationToken);

        var preparation = await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (preparation is null) return false;
        var document = await preparationDatabase.Documents
            .SingleOrDefaultAsync(x => x.PreparationId == preparation.Id && x.Id == documentId, cancellationToken);
        if (document is null) return false;

        var fileName = document.FileName;
        preparationDatabase.Documents.Remove(document);
        preparation.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await preparationDatabase.SaveChangesAsync(cancellationToken);

        var assignment = await engagementsDatabase.Assignments.Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is not null)
        {
            var linked = assignment.Documents
                .Where(x => x.StorageReference == $"coordination-document:{documentId}")
                .ToArray();
            foreach (var item in linked) engagementsDatabase.Documents.Remove(item);
            var anyCoordinationFiles = await preparationDatabase.Documents.AsNoTracking()
                .AnyAsync(x => x.PreparationId == preparation.Id, cancellationToken);
            assignment.DocumentsStatus = anyCoordinationFiles ? "received" : preparation.TermsStatus == "accepted" ? "in-progress" : "not-started";
            assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        await AddActivityAsync(
            tenantId,
            assignmentId,
            "document-removed",
            "Assignment document removed",
            fileName,
            actor,
            DateTimeOffset.UtcNow,
            cancellationToken);
        return true;
    }

    private async Task SyncAssignmentAsync(EngagementPreparationRecord preparation, CancellationToken cancellationToken)
    {
        var assignment = await engagementsDatabase.Assignments
            .Include(x => x.Tasks)
            .Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == preparation.TenantId && x.Id == preparation.AssignmentId, cancellationToken);
        if (assignment is null) return;

        var now = DateTimeOffset.UtcNow;
        assignment.TravelStatus = TravelComplete(preparation) ? "confirmed" : TravelStarted(preparation) ? "in-progress" : "not-started";
        assignment.LodgingStatus = LodgingComplete(preparation) ? "confirmed" : LodgingStarted(preparation) ? "in-progress" : "not-started";
        assignment.TransportationStatus = TransportationComplete(preparation) ? "confirmed" : TransportationStarted(preparation) ? "in-progress" : "not-started";
        assignment.HostStatus = preparation.TermsStatus != "accepted"
            ? "not-started"
            : preparation.CoordinationStatus == "submitted" ? "confirmed" : "in-progress";
        assignment.DocumentsStatus = await preparationDatabase.Documents.AsNoTracking()
            .AnyAsync(x => x.PreparationId == preparation.Id, cancellationToken)
            ? "received"
            : preparation.TermsStatus == "accepted" ? "in-progress" : "not-started";
        assignment.UpdatedAtUtc = now;

        var primary = DeserializeContacts(preparation.ContactsJson)
            .FirstOrDefault(x => string.Equals(x.Type, "primary", StringComparison.OrdinalIgnoreCase) || string.Equals(x.Type, "host", StringComparison.OrdinalIgnoreCase));
        if (primary is not null)
        {
            assignment.HostContactName = Trim(primary.Name) ?? assignment.HostContactName;
            assignment.HostContactEmail = Trim(primary.Email)?.ToLowerInvariant() ?? assignment.HostContactEmail;
        }

        UpdateTask(
            assignment.Tasks.FirstOrDefault(x => x.Category == "host" && x.Title == "Complete host coordination"),
            preparation.CoordinationStatus == "submitted" ? "complete" : preparation.TermsStatus == "accepted" ? "in-progress" : "open",
            preparation.CoordinationStatus == "submitted"
                ? "Host preparation is complete and connected to the assignment."
                : preparation.TermsStatus == "accepted" ? "Host preparation is in progress." : "Waiting for accepted terms.",
            now);

        UpdateTask(
            assignment.Tasks.FirstOrDefault(x => x.Category == "travel" && x.Title == "Confirm travel and lodging plan"),
            TravelComplete(preparation) && LodgingComplete(preparation)
                ? "complete"
                : TravelStarted(preparation) || LodgingStarted(preparation) ? "in-progress" : "open",
            null,
            now);

        UpdateTask(
            assignment.Tasks.FirstOrDefault(x => x.Category == "documents" && x.Title == "Finalize engagement agreement"),
            preparation.TermsStatus == "accepted" ? "complete" : "open",
            preparation.TermsStatus == "accepted" && preparation.TermsAcceptedAtUtc is DateTimeOffset accepted
                ? $"Terms accepted on {accepted:yyyy-MM-dd}."
                : null,
            now);

        await engagementsDatabase.SaveChangesAsync(cancellationToken);
    }

    private static AssignmentReadinessRadar BuildReadiness(EngagementPreparationDetails preparation, EngagementAssignment assignment)
    {
        var coordination = preparation.Coordination;
        var terms = preparation.TermsStatus == "accepted" ? 100 : 0;
        var travel = TravelComplete(coordination) ? 100 : TravelStarted(coordination) ? 55 : 0;
        var lodging = LodgingComplete(coordination) ? 100 : LodgingStarted(coordination) ? 55 : 0;
        var transportation = TransportationComplete(coordination) ? 100 : TransportationStarted(coordination) ? 55 : 0;
        var primaryContact = coordination.Contacts.Any(x =>
            string.Equals(x.Type, "primary", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(x.Type, "host", StringComparison.OrdinalIgnoreCase));
        var host = 0;
        if (coordination.Schedule.Count > 0) host += 40;
        if (primaryContact) host += 30;
        if (preparation.CoordinationStatus == "submitted") host += 30;
        var documents = coordination.Documents.Count > 0 ? 100 : preparation.TermsStatus == "accepted" ? 50 : 0;

        var lanes = new[]
        {
            Lane("terms", "Terms", terms, terms == 100 ? "Accepted terms are on file." : "Host acceptance is still required."),
            Lane("travel", "Travel", travel, TravelComplete(coordination) ? "Outbound and return itinerary are complete." : TravelStarted(coordination) ? "Travel details are partially entered." : "Travel itinerary has not been entered."),
            Lane("lodging", "Lodging", lodging, LodgingComplete(coordination) ? "Hotel details and stay dates are complete." : LodgingStarted(coordination) ? "Lodging details are partially entered." : "Lodging details have not been entered."),
            Lane("transportation", "Local transportation", transportation, TransportationComplete(coordination) ? "Local transportation and pickup contact are complete." : TransportationStarted(coordination) ? "Transportation planning is in progress." : "Local transportation has not been entered."),
            Lane("host", "Host preparation", host, preparation.CoordinationStatus == "submitted" ? "Schedule and primary contact are prepared." : coordination.Schedule.Count > 0 || primaryContact ? "Host coordination is still being completed." : "Host schedule and contacts are still needed."),
            Lane("documents", "Documents", documents, coordination.Documents.Count > 0 ? "Host coordination documents have been received." : preparation.TermsStatus == "accepted" ? "Accepted terms are on file; supporting host files are still pending." : "No preparation documents are on file.")
        };

        var attention = new List<string>();
        if (terms < 100) attention.Add("Accepted terms are still outstanding.");
        if (travel < 100) attention.Add("Complete the outbound and return travel itinerary.");
        if (lodging < 100) attention.Add("Complete the lodging record and stay dates.");
        if (transportation < 100) attention.Add("Confirm local transportation and the pickup contact.");
        if (coordination.Schedule.Count == 0) attention.Add("Add the event schedule or ministry sessions.");
        if (!primaryContact) attention.Add("Confirm the primary host contact.");
        if (string.IsNullOrWhiteSpace(coordination.PrayerFocus)) attention.Add("Record the host prayer focus for the ministry team.");
        if (coordination.Documents.Count == 0) attention.Add("Collect supporting host documents when available.");

        var overall = (int)Math.Round(lanes.Average(x => x.Percent));
        return new AssignmentReadinessRadar(overall, ReadinessStatus(overall), lanes, attention);
    }

    private static IReadOnlyList<AssignmentActivityItem> BuildActivity(
        EngagementPreparationDetails preparation,
        EngagementAssignment assignment,
        SpeakingRequestRecord? request,
        IReadOnlyList<AssignmentWorkspaceActivityRecord> persisted)
    {
        var items = new List<AssignmentActivityItem>();
        if (request is not null)
        {
            items.AddRange(request.Communications.Select(x => new AssignmentActivityItem(
                $"invitation-{x.Type}",
                CommunicationTitle(x.Type),
                x.Message,
                x.Actor,
                x.CreatedAtUtc)));
        }

        if (preparation.TermsAcceptedAtUtc is DateTimeOffset acceptedAt)
        {
            items.Add(new AssignmentActivityItem(
                "terms-accepted",
                "Engagement terms accepted",
                preparation.TermsAcceptedByName is null
                    ? "The approved engagement terms were accepted."
                    : $"Accepted by {preparation.TermsAcceptedByName}.",
                preparation.TermsAcceptedByName ?? "Host organization",
                acceptedAt));
        }

        if (preparation.CoordinationSubmittedAtUtc is DateTimeOffset submittedAt)
        {
            items.Add(new AssignmentActivityItem(
                "coordination-submitted",
                "Host preparation submitted",
                "Travel, lodging, schedule, contacts, prayer focus, and host details were submitted into the assignment.",
                "Host coordination",
                submittedAt));
        }

        items.AddRange(preparation.Coordination.Documents.Select(x => new AssignmentActivityItem(
            "document-received",
            "Coordination document received",
            x.FileName,
            "Engagements",
            x.UploadedAtUtc)));

        items.AddRange(assignment.Tasks
            .Where(x => x.UpdatedAtUtc > assignment.CreatedAtUtc)
            .Select(x => new AssignmentActivityItem(
                "readiness-task",
                $"Readiness item · {x.Title}",
                $"Status: {FormatStatus(x.Status)}{(string.IsNullOrWhiteSpace(x.Detail) ? string.Empty : $" · {x.Detail}")}",
                x.Owner,
                x.UpdatedAtUtc)));

        items.AddRange(persisted.Select(x => new AssignmentActivityItem(
            x.Kind,
            x.Title,
            x.Detail,
            x.Actor,
            x.OccurredAtUtc)));

        return items
            .OrderByDescending(x => x.OccurredAtUtc)
            .ThenBy(x => x.Title)
            .Take(60)
            .ToArray();
    }

    private async Task AddActivityAsync(
        Guid tenantId,
        Guid assignmentId,
        string kind,
        string title,
        string detail,
        string actor,
        DateTimeOffset occurredAtUtc,
        CancellationToken cancellationToken)
    {
        activityDatabase.Activities.Add(new AssignmentWorkspaceActivityRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            Kind = Limit(Required(kind, nameof(kind)), 60),
            Title = Limit(Required(title, nameof(title)), 240),
            Detail = Limit(Required(detail, nameof(detail)), 3000),
            Actor = Limit(string.IsNullOrWhiteSpace(actor) ? "Ministry team" : actor.Trim(), 180),
            OccurredAtUtc = occurredAtUtc
        });
        await activityDatabase.SaveChangesAsync(cancellationToken);
    }

    private static void ApplyCoordination(EngagementPreparationRecord preparation, HostCoordinationUpdate input)
    {
        preparation.OutboundAirline = Trim(input.OutboundAirline);
        preparation.OutboundFlightNumber = Trim(input.OutboundFlightNumber);
        preparation.OutboundConfirmationNumber = Trim(input.OutboundConfirmationNumber);
        preparation.OutboundDepartureAirport = Trim(input.OutboundDepartureAirport);
        preparation.OutboundArrivalAirport = Trim(input.OutboundArrivalAirport);
        preparation.OutboundDepartsAtUtc = input.OutboundDepartsAtUtc;
        preparation.OutboundArrivesAtUtc = input.OutboundArrivesAtUtc;
        preparation.ReturnAirline = Trim(input.ReturnAirline);
        preparation.ReturnFlightNumber = Trim(input.ReturnFlightNumber);
        preparation.ReturnConfirmationNumber = Trim(input.ReturnConfirmationNumber);
        preparation.ReturnDepartureAirport = Trim(input.ReturnDepartureAirport);
        preparation.ReturnArrivalAirport = Trim(input.ReturnArrivalAirport);
        preparation.ReturnDepartsAtUtc = input.ReturnDepartsAtUtc;
        preparation.ReturnArrivesAtUtc = input.ReturnArrivesAtUtc;
        preparation.HotelName = Trim(input.HotelName);
        preparation.HotelAddress = Trim(input.HotelAddress);
        preparation.HotelConfirmationNumber = Trim(input.HotelConfirmationNumber);
        preparation.HotelCheckInAtUtc = input.HotelCheckInAtUtc;
        preparation.HotelCheckOutAtUtc = input.HotelCheckOutAtUtc;
        preparation.TransportationPlan = Trim(input.TransportationPlan);
        preparation.PickupContactName = Trim(input.PickupContactName);
        preparation.PickupContactPhone = Trim(input.PickupContactPhone);
        preparation.ScheduleJson = JsonSerializer.Serialize(input.Schedule ?? [], JsonOptions);
        preparation.ContactsJson = JsonSerializer.Serialize(input.Contacts ?? [], JsonOptions);
        preparation.PromotionRequirements = Trim(input.PromotionRequirements);
        preparation.PrayerFocus = Trim(input.PrayerFocus);
        preparation.HostNotes = Trim(input.HostNotes);
    }

    private static void ValidateCoordination(HostCoordinationUpdate input)
    {
        Max(input.OutboundAirline, 120, nameof(input.OutboundAirline));
        Max(input.OutboundFlightNumber, 40, nameof(input.OutboundFlightNumber));
        Max(input.OutboundConfirmationNumber, 80, nameof(input.OutboundConfirmationNumber));
        Max(input.OutboundDepartureAirport, 120, nameof(input.OutboundDepartureAirport));
        Max(input.OutboundArrivalAirport, 120, nameof(input.OutboundArrivalAirport));
        Max(input.ReturnAirline, 120, nameof(input.ReturnAirline));
        Max(input.ReturnFlightNumber, 40, nameof(input.ReturnFlightNumber));
        Max(input.ReturnConfirmationNumber, 80, nameof(input.ReturnConfirmationNumber));
        Max(input.ReturnDepartureAirport, 120, nameof(input.ReturnDepartureAirport));
        Max(input.ReturnArrivalAirport, 120, nameof(input.ReturnArrivalAirport));
        Max(input.HotelName, 180, nameof(input.HotelName));
        Max(input.HotelAddress, 500, nameof(input.HotelAddress));
        Max(input.HotelConfirmationNumber, 80, nameof(input.HotelConfirmationNumber));
        Max(input.TransportationPlan, 3000, nameof(input.TransportationPlan));
        Max(input.PickupContactName, 180, nameof(input.PickupContactName));
        Max(input.PickupContactPhone, 60, nameof(input.PickupContactPhone));
        Max(input.PromotionRequirements, 4000, nameof(input.PromotionRequirements));
        Max(input.PrayerFocus, 4000, nameof(input.PrayerFocus));
        Max(input.HostNotes, 4000, nameof(input.HostNotes));

        foreach (var item in input.Schedule ?? [])
        {
            Max(item.Title, 240, "schedule title");
            Max(item.StartsAt, 20, "schedule start time");
            Max(item.EndsAt, 20, "schedule end time");
            Max(item.Location, 300, "schedule location");
            Max(item.Notes, 2000, "schedule notes");
        }
        foreach (var item in input.Contacts ?? [])
        {
            Max(item.Type, 60, "contact type");
            Max(item.Name, 180, "contact name");
            Max(item.Email, 320, "contact email");
            Max(item.Phone, 60, "contact phone");
        }

        var scheduleJson = JsonSerializer.Serialize(input.Schedule ?? [], JsonOptions);
        var contactsJson = JsonSerializer.Serialize(input.Contacts ?? [], JsonOptions);
        if (scheduleJson.Length > 16000) throw new ArgumentException("The event schedule is too large to save.");
        if (contactsJson.Length > 12000) throw new ArgumentException("The contact list is too large to save.");
    }

    private static AssignmentReadinessLane Lane(string key, string label, int percent, string detail) =>
        new(key, label, percent, LaneStatus(percent), detail);

    private static string LaneStatus(int percent) => percent switch
    {
        >= 100 => "complete",
        >= 70 => "ready",
        >= 35 => "in-progress",
        _ => "not-started"
    };

    private static string ReadinessStatus(int percent) => percent switch
    {
        >= 90 => "ready",
        >= 75 => "nearly-ready",
        >= 35 => "in-progress",
        _ => "not-started"
    };

    private static string CommunicationTitle(string type) => type switch
    {
        "submitted" => "Invitation submitted",
        "information-requested" => "Information requested",
        "host-responded" => "Host resubmitted invitation",
        "approved" => "Invitation approved",
        "declined" => "Invitation declined",
        _ => FormatStatus(type)
    };

    private static string FormatStatus(string value) =>
        string.Join(' ', value.Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => char.ToUpperInvariant(x[0]) + x[1..]));

    private static void UpdateTask(EngagementTask? task, string status, string? detail, DateTimeOffset now)
    {
        if (task is null) return;
        task.Status = status;
        if (detail is not null) task.Detail = detail;
        task.UpdatedAtUtc = now;
    }

    private static bool TravelStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) || !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) || p.OutboundDepartsAtUtc is not null ||
        !string.IsNullOrWhiteSpace(p.ReturnAirline) || !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) || p.ReturnDepartsAtUtc is not null;

    private static bool TravelComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) && !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.OutboundDepartureAirport) && !string.IsNullOrWhiteSpace(p.OutboundArrivalAirport) &&
        p.OutboundDepartsAtUtc is not null && p.OutboundArrivesAtUtc is not null &&
        !string.IsNullOrWhiteSpace(p.ReturnAirline) && !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.ReturnDepartureAirport) && !string.IsNullOrWhiteSpace(p.ReturnArrivalAirport) &&
        p.ReturnDepartsAtUtc is not null && p.ReturnArrivesAtUtc is not null;

    private static bool LodgingStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) || !string.IsNullOrWhiteSpace(p.HotelAddress) || p.HotelCheckInAtUtc is not null;

    private static bool LodgingComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) && !string.IsNullOrWhiteSpace(p.HotelAddress) &&
        p.HotelCheckInAtUtc is not null && p.HotelCheckOutAtUtc is not null;

    private static bool TransportationStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) || !string.IsNullOrWhiteSpace(p.PickupContactName);

    private static bool TransportationComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) && !string.IsNullOrWhiteSpace(p.PickupContactName) && !string.IsNullOrWhiteSpace(p.PickupContactPhone);

    private static bool TravelStarted(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) || !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) || p.OutboundDepartsAtUtc is not null ||
        !string.IsNullOrWhiteSpace(p.ReturnAirline) || !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) || p.ReturnDepartsAtUtc is not null;

    private static bool TravelComplete(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) && !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.OutboundDepartureAirport) && !string.IsNullOrWhiteSpace(p.OutboundArrivalAirport) &&
        p.OutboundDepartsAtUtc is not null && p.OutboundArrivesAtUtc is not null &&
        !string.IsNullOrWhiteSpace(p.ReturnAirline) && !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.ReturnDepartureAirport) && !string.IsNullOrWhiteSpace(p.ReturnArrivalAirport) &&
        p.ReturnDepartsAtUtc is not null && p.ReturnArrivesAtUtc is not null;

    private static bool LodgingStarted(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) || !string.IsNullOrWhiteSpace(p.HotelAddress) || p.HotelCheckInAtUtc is not null;

    private static bool LodgingComplete(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) && !string.IsNullOrWhiteSpace(p.HotelAddress) &&
        p.HotelCheckInAtUtc is not null && p.HotelCheckOutAtUtc is not null;

    private static bool TransportationStarted(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) || !string.IsNullOrWhiteSpace(p.PickupContactName);

    private static bool TransportationComplete(HostCoordinationDetails p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) && !string.IsNullOrWhiteSpace(p.PickupContactName) && !string.IsNullOrWhiteSpace(p.PickupContactPhone);

    private static IReadOnlyList<HostContactInput> DeserializeContacts(string json) =>
        JsonSerializer.Deserialize<HostContactInput[]>(json, JsonOptions) ?? [];

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Max(string? value, int length, string field)
    {
        if (value?.Length > length) throw new ArgumentException($"{field} cannot exceed {length} characters.");
    }

    private static string Limit(string value, int length) => value.Length <= length ? value : value[..length];
}

public static class AssignmentWorkspaceEndpoints
{
    private static readonly string[] Coordinators = ["Administrator", "Coordinator"];

    public static IEndpointRouteBuilder MapAssignmentWorkspaceEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements/assignments").RequireAuthorization();

        group.MapGet("/{id:guid}/workspace", async (
            Guid id,
            HttpContext context,
            AssignmentWorkspaceService service,
            CancellationToken ct) =>
        {
            var item = await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            if (item is null) return Results.NotFound(new { message = "This assignment does not have an approved invitation preparation record." });
            var termsUrl = $"{context.Request.Scheme}://{context.Request.Host}/host/terms/{item.Preparation.TermsToken}";
            var coordinationUrl = item.Preparation.TermsStatus == "accepted"
                ? $"{context.Request.Scheme}://{context.Request.Host}/host/coordination/{item.Preparation.CoordinationToken}"
                : null;
            return Results.Ok(new { workspace = item, termsUrl, coordinationUrl });
        });

        group.MapPut("/{id:guid}/workspace/coordination", async (
            Guid id,
            HostCoordinationUpdate request,
            HttpContext context,
            AssignmentWorkspaceService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.SaveCoordinationAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    request,
                    context.User.Identity?.Name ?? "Ministry team",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["coordination"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        }).RequireAuthorization("EngagementsWrite");

        group.MapPost("/{id:guid}/workspace/documents", async (
            Guid id,
            HttpRequest request,
            HttpContext context,
            AssignmentWorkspaceService service,
            CancellationToken ct) =>
        {
            try
            {
                if (!request.HasFormContentType) return Results.BadRequest(new { message = "Upload a document using multipart form data." });
                var form = await request.ReadFormAsync(ct);
                var file = form.Files.GetFile("file");
                if (file is null) return Results.BadRequest(new { message = "Choose a file to upload." });
                await using var stream = new MemoryStream();
                await file.CopyToAsync(stream, ct);
                var item = await service.AddDocumentAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    file.FileName,
                    file.ContentType,
                    stream.ToArray(),
                    context.User.Identity?.Name ?? "Ministry team",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
        }).DisableAntiforgery().RequireAuthorization("EngagementsWrite");

        group.MapDelete("/{id:guid}/workspace/documents/{documentId:guid}", async (
            Guid id,
            Guid documentId,
            HttpContext context,
            AssignmentWorkspaceService service,
            CancellationToken ct) =>
        {
            var deleted = await service.DeleteDocumentAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                documentId,
                context.User.Identity?.Name ?? "Ministry team",
                ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization("EngagementsWrite");

        return endpoints;
    }
}
