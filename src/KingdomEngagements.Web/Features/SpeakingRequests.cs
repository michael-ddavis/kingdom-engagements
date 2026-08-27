using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class SpeakingRequestsDbContext(DbContextOptions<SpeakingRequestsDbContext> options) : DbContext(options)
{
    public DbSet<SpeakingRequestRecord> Requests => Set<SpeakingRequestRecord>();
    public DbSet<SpeakingRequestCommunicationRecord> Communications => Set<SpeakingRequestCommunicationRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var request = modelBuilder.Entity<SpeakingRequestRecord>();
        request.ToTable("EngagementSpeakingRequests");
        request.HasKey(x => x.Id);
        request.HasIndex(x => new { x.TenantId, x.ReferenceNumber }).IsUnique();
        request.HasIndex(x => x.EditToken).IsUnique();
        request.Property(x => x.ReferenceNumber).HasMaxLength(40).IsRequired();
        request.Property(x => x.EditToken).HasMaxLength(64).IsRequired();
        request.Property(x => x.OrganizationName).HasMaxLength(180).IsRequired();
        request.Property(x => x.EventName).HasMaxLength(180).IsRequired();
        request.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        request.Property(x => x.ContactName).HasMaxLength(140).IsRequired();
        request.Property(x => x.ContactEmail).HasMaxLength(320).IsRequired();
        request.Property(x => x.ContactPhone).HasMaxLength(60).IsRequired();
        request.Property(x => x.City).HasMaxLength(120).IsRequired();
        request.Property(x => x.State).HasMaxLength(120);
        request.Property(x => x.Country).HasMaxLength(120).IsRequired();
        request.Property(x => x.Region).HasMaxLength(120);
        request.Property(x => x.TimeZone).HasMaxLength(120).IsRequired();
        request.Property(x => x.VenueAddress).HasMaxLength(500).IsRequired();
        request.Property(x => x.VenueName).HasMaxLength(180).IsRequired();
        request.Property(x => x.MinistryRequest).HasMaxLength(3000).IsRequired();
        request.Property(x => x.TravelCoverageStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.LodgingCoverageStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.HonorariumStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.TravelBookedBy).HasMaxLength(32).IsRequired();
        request.Property(x => x.HonorariumAmount).HasPrecision(18, 2);
        request.Property(x => x.HonorariumCurrency).HasMaxLength(8).IsRequired();
        request.Property(x => x.PaymentStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.AgreementStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.EngagementStatus).HasMaxLength(32).IsRequired();
        request.Property(x => x.Status).HasMaxLength(40).IsRequired();
        request.Property(x => x.DeclineReason).HasMaxLength(3000);
        request.HasMany(x => x.Communications).WithOne(x => x.Request)
            .HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Cascade);

        var communication = modelBuilder.Entity<SpeakingRequestCommunicationRecord>();
        communication.ToTable("EngagementSpeakingRequestCommunications");
        communication.HasKey(x => x.Id);
        communication.Property(x => x.Type).HasMaxLength(60).IsRequired();
        communication.Property(x => x.Message).HasMaxLength(4000).IsRequired();
        communication.Property(x => x.Actor).HasMaxLength(180).IsRequired();
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
IF OBJECT_ID(N'[dbo].[EngagementSpeakingRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementSpeakingRequests] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [ReferenceNumber] nvarchar(40) NOT NULL,
        [EditToken] nvarchar(64) NOT NULL,
        [EditTokenExpiresAtUtc] datetimeoffset NULL,
        [OrganizationName] nvarchar(180) NOT NULL,
        [EventName] nvarchar(180) NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [ContactName] nvarchar(140) NOT NULL,
        [ContactEmail] nvarchar(320) NOT NULL,
        [ContactPhone] nvarchar(60) NOT NULL,
        [City] nvarchar(120) NOT NULL,
        [State] nvarchar(120) NULL,
        [Country] nvarchar(120) NOT NULL,
        [Region] nvarchar(120) NULL,
        [TimeZone] nvarchar(120) NOT NULL,
        [VenueAddress] nvarchar(500) NOT NULL,
        [VenueName] nvarchar(180) NOT NULL,
        [StartDate] date NOT NULL,
        [EndDate] date NOT NULL,
        [MinistryRequest] nvarchar(3000) NOT NULL,
        [ExpectedAttendance] int NOT NULL,
        [TravelCoverageStatus] nvarchar(32) NOT NULL,
        [LodgingCoverageStatus] nvarchar(32) NOT NULL,
        [HonorariumStatus] nvarchar(32) NOT NULL,
        [TravelBookedBy] nvarchar(32) NOT NULL,
        [HonorariumAmount] decimal(18,2) NOT NULL,
        [HonorariumCurrency] nvarchar(8) NOT NULL,
        [PaymentStatus] nvarchar(32) NOT NULL,
        [AgreementStatus] nvarchar(32) NOT NULL,
        [EngagementStatus] nvarchar(32) NOT NULL,
        [ReadinessPercentage] int NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [DeclineReason] nvarchar(3000) NULL,
        [AssignmentId] uniqueidentifier NULL,
        [SubmittedAtUtc] datetimeoffset NOT NULL,
        [UpdatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementSpeakingRequests] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_EngagementSpeakingRequests_TenantId_ReferenceNumber]
        ON [dbo].[EngagementSpeakingRequests] ([TenantId], [ReferenceNumber]);
    CREATE UNIQUE INDEX [IX_EngagementSpeakingRequests_EditToken]
        ON [dbo].[EngagementSpeakingRequests] ([EditToken]);
END;

IF OBJECT_ID(N'[dbo].[EngagementSpeakingRequestCommunications]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementSpeakingRequestCommunications] (
        [Id] uniqueidentifier NOT NULL,
        [RequestId] uniqueidentifier NOT NULL,
        [Type] nvarchar(60) NOT NULL,
        [Message] nvarchar(4000) NOT NULL,
        [Actor] nvarchar(180) NOT NULL,
        [CreatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementSpeakingRequestCommunications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EngagementSpeakingRequestCommunications_EngagementSpeakingRequests_RequestId]
            FOREIGN KEY ([RequestId]) REFERENCES [dbo].[EngagementSpeakingRequests] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_EngagementSpeakingRequestCommunications_RequestId]
        ON [dbo].[EngagementSpeakingRequestCommunications] ([RequestId]);
END;
""";

        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class SpeakingRequestRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string EditToken { get; set; } = string.Empty;
    public DateTimeOffset? EditTokenExpiresAtUtc { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? State { get; set; }
    public string Country { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string TimeZone { get; set; } = string.Empty;
    public string VenueAddress { get; set; } = string.Empty;
    public string VenueName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string MinistryRequest { get; set; } = string.Empty;
    public int ExpectedAttendance { get; set; }
    public string TravelCoverageStatus { get; set; } = "not-determined";
    public string LodgingCoverageStatus { get; set; } = "not-determined";
    public string HonorariumStatus { get; set; } = "not-determined";
    public string TravelBookedBy { get; set; } = "not-determined";
    public decimal HonorariumAmount { get; set; }
    public string HonorariumCurrency { get; set; } = "USD";
    public string PaymentStatus { get; set; } = "not-due";
    public string AgreementStatus { get; set; } = "not-started";
    public string EngagementStatus { get; set; } = "proposed";
    public int ReadinessPercentage { get; set; }
    public string Status { get; set; } = "awaiting-review";
    public string? DeclineReason { get; set; }
    public Guid? AssignmentId { get; set; }
    public DateTimeOffset SubmittedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public ICollection<SpeakingRequestCommunicationRecord> Communications { get; set; } = [];
}

public sealed class SpeakingRequestCommunicationRecord
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public SpeakingRequestRecord? Request { get; set; }
}

public sealed record SpeakingRequestInput(
    string OrganizationName,
    string EventName,
    string EventType,
    string ContactName,
    string ContactEmail,
    string ContactPhone,
    string City,
    string? State,
    string Country,
    string? Region,
    string TimeZone,
    string VenueAddress,
    string VenueName,
    DateOnly StartDate,
    DateOnly EndDate,
    string MinistryRequest,
    int ExpectedAttendance,
    string TravelCoverageStatus,
    string LodgingCoverageStatus,
    string HonorariumStatus,
    string TravelBookedBy,
    decimal HonorariumAmount,
    string HonorariumCurrency,
    string PaymentStatus,
    string AgreementStatus,
    string EngagementStatus);

public sealed record HostSpeakingRequestUpdate(SpeakingRequestInput Request, string ResponseMessage);
public sealed record ReviewMessageRequest(string Message);
public sealed record DeclineSpeakingRequest(string Reason);

public sealed record SpeakingRequestCommunicationDto(Guid Id, string Type, string Message, string Actor, DateTimeOffset CreatedAtUtc);

public sealed record SpeakingRequestDetails(
    Guid Id,
    Guid TenantId,
    string ReferenceNumber,
    string EditToken,
    DateTimeOffset? EditTokenExpiresAtUtc,
    string OrganizationName,
    string EventName,
    string EventType,
    string ContactName,
    string ContactEmail,
    string ContactPhone,
    string City,
    string? State,
    string Country,
    string? Region,
    string TimeZone,
    string VenueAddress,
    string VenueName,
    DateOnly StartDate,
    DateOnly EndDate,
    string MinistryRequest,
    int ExpectedAttendance,
    string TravelCoverageStatus,
    string LodgingCoverageStatus,
    string HonorariumStatus,
    string TravelBookedBy,
    decimal HonorariumAmount,
    string HonorariumCurrency,
    string PaymentStatus,
    string AgreementStatus,
    string EngagementStatus,
    int ReadinessPercentage,
    string Status,
    string? DeclineReason,
    Guid? AssignmentId,
    DateTimeOffset SubmittedAtUtc,
    DateTimeOffset UpdatedAtUtc,
    IReadOnlyList<SpeakingRequestCommunicationDto> Communications);

public sealed class SpeakingRequestsService(
    SpeakingRequestsDbContext requestsDatabase,
    EngagementsDbContext engagementsDatabase)
{
    private static readonly HashSet<string> ConfirmationValues = new(StringComparer.OrdinalIgnoreCase)
        { "yes", "no", "not-determined" };
    private static readonly HashSet<string> TravelOwners = new(StringComparer.OrdinalIgnoreCase)
        { "host", "ministry-team", "shared", "not-determined" };
    private static readonly HashSet<string> PaymentStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "not-applicable", "not-due", "pending", "paid" };
    private static readonly HashSet<string> AgreementStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "not-started", "drafted", "sent", "signed" };
    private static readonly HashSet<string> EngagementStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "proposed", "scheduled", "rescheduled", "cancelled" };

    public async Task<SpeakingRequestDetails> CreateAsync(Guid tenantId, SpeakingRequestInput input, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        Validate(input);
        var now = DateTimeOffset.UtcNow;
        var request = new SpeakingRequestRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReferenceNumber = $"CTG-{now:yyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}",
            EditToken = Guid.NewGuid().ToString("N"),
            Status = "awaiting-review",
            SubmittedAtUtc = now,
            UpdatedAtUtc = now
        };
        Apply(request, input);
        request.Communications.Add(NewCommunication(request.Id, "submitted",
            "Speaking invitation submitted for ministry-team review.", request.ContactName, now));
        requestsDatabase.Requests.Add(request);
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    public async Task<IReadOnlyList<SpeakingRequestDetails>> GetAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        return (await requestsDatabase.Requests.AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .Include(x => x.Communications)
                .OrderByDescending(x => x.SubmittedAtUtc)
                .ToListAsync(cancellationToken))
            .Select(Map)
            .ToArray();
    }

    public async Task<SpeakingRequestDetails?> GetAsync(Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests.AsNoTracking()
            .Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        return request is null ? null : Map(request);
    }

    public async Task<SpeakingRequestDetails?> GetForHostAsync(string token, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests.AsNoTracking()
            .Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.EditToken == token, cancellationToken);
        if (!HostLinkValid(request)) return null;
        return Map(request!);
    }

    public async Task<SpeakingRequestDetails?> SubmitHostResponseAsync(string token, HostSpeakingRequestUpdate update, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        Validate(update.Request);
        var response = Required(update.ResponseMessage, nameof(update.ResponseMessage));
        var request = await requestsDatabase.Requests.Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.EditToken == token, cancellationToken);
        if (!HostLinkValid(request)) return null;

        Apply(request!, update.Request);
        var now = DateTimeOffset.UtcNow;
        request!.Status = "awaiting-review";
        request.EditTokenExpiresAtUtc = null;
        request.UpdatedAtUtc = now;
        request.Communications.Add(NewCommunication(request.Id, "host-responded", response, request.ContactName, now));
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    public async Task<SpeakingRequestDetails?> RequestInformationAsync(Guid tenantId, Guid id, string message, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var text = Required(message, nameof(message));
        var request = await requestsDatabase.Requests.Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (request is null) return null;
        EnsureReviewable(request);
        var now = DateTimeOffset.UtcNow;
        request.Status = "information-needed";
        request.EditToken = Guid.NewGuid().ToString("N");
        request.EditTokenExpiresAtUtc = now.AddDays(14);
        request.UpdatedAtUtc = now;
        request.Communications.Add(NewCommunication(request.Id, "information-requested", text, "Cynthia Thompson Global", now));
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    public async Task<SpeakingRequestDetails?> DeclineAsync(Guid tenantId, Guid id, string reason, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var text = Required(reason, nameof(reason));
        var request = await requestsDatabase.Requests.Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (request is null) return null;
        EnsureReviewable(request);
        var now = DateTimeOffset.UtcNow;
        request.Status = "declined";
        request.DeclineReason = text;
        request.EditTokenExpiresAtUtc = null;
        request.UpdatedAtUtc = now;
        request.Communications.Add(NewCommunication(request.Id, "declined", text, "Cynthia Thompson Global", now));
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    public async Task<(SpeakingRequestDetails Request, Guid AssignmentId)?> ApproveAsync(Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests.Include(x => x.Communications)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (request is null) return null;

        if (request.AssignmentId is Guid existingAssignmentId)
            return (Map(request), existingAssignmentId);
        EnsureReviewable(request);

        var externalId = $"request:{request.ReferenceNumber}";
        var assignment = await engagementsDatabase.Assignments
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.ExternalAssignmentId == externalId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        if (assignment is null)
        {
            assignment = new EngagementAssignment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ExternalAssignmentId = externalId,
                Title = request.EventName,
                SpeakerName = "Cynthia Thompson",
                HostOrganization = request.OrganizationName,
                HostContactName = request.ContactName,
                HostContactEmail = request.ContactEmail,
                Location = BuildLocation(request),
                StartsAtUtc = new DateTimeOffset(request.StartDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero),
                EndsAtUtc = new DateTimeOffset(request.EndDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero),
                Status = "approved",
                TravelStatus = "not-started",
                LodgingStatus = "not-started",
                TransportationStatus = "not-started",
                HostStatus = "in-progress",
                DocumentsStatus = request.AgreementStatus == "signed" ? "received" : "in-progress",
                CloseoutStatus = "not-started",
                Notes = BuildHostSnapshot(request),
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            assignment.Tasks.Add(new EngagementTask
            {
                Id = Guid.NewGuid(), Category = "host", Title = "Complete host coordination",
                Owner = "Host Coordinator", Status = "open", UpdatedAtUtc = now
            });
            assignment.Tasks.Add(new EngagementTask
            {
                Id = Guid.NewGuid(), Category = "travel", Title = "Confirm travel and lodging plan",
                Owner = request.TravelBookedBy == "host" ? "Host Coordinator" : "Engagement Coordinator",
                Status = "open", UpdatedAtUtc = now
            });
            assignment.Tasks.Add(new EngagementTask
            {
                Id = Guid.NewGuid(), Category = "documents", Title = "Finalize engagement agreement",
                Owner = "Engagement Coordinator",
                Status = request.AgreementStatus == "signed" ? "complete" : "open", UpdatedAtUtc = now
            });
            engagementsDatabase.Assignments.Add(assignment);
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }
        else
        {
            assignment.Title = request.EventName;
            assignment.HostOrganization = request.OrganizationName;
            assignment.HostContactName = request.ContactName;
            assignment.HostContactEmail = request.ContactEmail;
            assignment.Location = BuildLocation(request);
            assignment.StartsAtUtc = new DateTimeOffset(request.StartDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
            assignment.EndsAtUtc = new DateTimeOffset(request.EndDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
            assignment.Notes = BuildHostSnapshot(request);
            assignment.UpdatedAtUtc = now;
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        request.Status = "approved";
        request.AssignmentId = assignment.Id;
        request.EditTokenExpiresAtUtc = null;
        request.UpdatedAtUtc = now;
        request.Communications.Add(NewCommunication(request.Id, "approved",
            "The invitation was approved and moved into assignment preparation.", "Cynthia Thompson Global", now));
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return (Map(request), assignment.Id);
    }

    private static void Apply(SpeakingRequestRecord request, SpeakingRequestInput input)
    {
        request.OrganizationName = Required(input.OrganizationName, nameof(input.OrganizationName));
        request.EventName = Required(input.EventName, nameof(input.EventName));
        request.EventType = Required(input.EventType, nameof(input.EventType));
        request.ContactName = Required(input.ContactName, nameof(input.ContactName));
        request.ContactEmail = Required(input.ContactEmail, nameof(input.ContactEmail)).ToLowerInvariant();
        request.ContactPhone = Required(input.ContactPhone, nameof(input.ContactPhone));
        request.City = Required(input.City, nameof(input.City));
        request.State = input.State?.Trim();
        request.Country = Required(input.Country, nameof(input.Country));
        request.Region = input.Region?.Trim();
        request.TimeZone = Required(input.TimeZone, nameof(input.TimeZone));
        request.VenueAddress = Required(input.VenueAddress, nameof(input.VenueAddress));
        request.VenueName = Required(input.VenueName, nameof(input.VenueName));
        request.StartDate = input.StartDate;
        request.EndDate = input.EndDate;
        request.MinistryRequest = Required(input.MinistryRequest, nameof(input.MinistryRequest));
        request.ExpectedAttendance = input.ExpectedAttendance;
        request.TravelCoverageStatus = Normalize(input.TravelCoverageStatus, ConfirmationValues, nameof(input.TravelCoverageStatus));
        request.LodgingCoverageStatus = Normalize(input.LodgingCoverageStatus, ConfirmationValues, nameof(input.LodgingCoverageStatus));
        request.HonorariumStatus = Normalize(input.HonorariumStatus, ConfirmationValues, nameof(input.HonorariumStatus));
        request.TravelBookedBy = Normalize(input.TravelBookedBy, TravelOwners, nameof(input.TravelBookedBy));
        request.HonorariumAmount = input.HonorariumAmount;
        request.HonorariumCurrency = Required(input.HonorariumCurrency, nameof(input.HonorariumCurrency)).ToUpperInvariant();
        request.PaymentStatus = Normalize(input.PaymentStatus, PaymentStatuses, nameof(input.PaymentStatus));
        request.AgreementStatus = Normalize(input.AgreementStatus, AgreementStatuses, nameof(input.AgreementStatus));
        request.EngagementStatus = Normalize(input.EngagementStatus, EngagementStatuses, nameof(input.EngagementStatus));
        request.ReadinessPercentage = Readiness(input);
    }

    private static void Validate(SpeakingRequestInput input)
    {
        if (input.StartDate == default || input.EndDate == default || input.EndDate < input.StartDate)
            throw new ArgumentException("Event dates are required and the end date cannot be before the start date.");
        if (input.ExpectedAttendance is < 1 or > 100000)
            throw new ArgumentException("Expected attendance must be between 1 and 100000.");
        if (input.HonorariumAmount < 0)
            throw new ArgumentException("Honorarium amount cannot be negative.");
        if (!Required(input.ContactEmail, nameof(input.ContactEmail)).Contains('@'))
            throw new ArgumentException("A valid contact email is required.");
        _ = Normalize(input.TravelCoverageStatus, ConfirmationValues, nameof(input.TravelCoverageStatus));
        _ = Normalize(input.LodgingCoverageStatus, ConfirmationValues, nameof(input.LodgingCoverageStatus));
        _ = Normalize(input.HonorariumStatus, ConfirmationValues, nameof(input.HonorariumStatus));
        _ = Normalize(input.TravelBookedBy, TravelOwners, nameof(input.TravelBookedBy));
        _ = Normalize(input.PaymentStatus, PaymentStatuses, nameof(input.PaymentStatus));
        _ = Normalize(input.AgreementStatus, AgreementStatuses, nameof(input.AgreementStatus));
        _ = Normalize(input.EngagementStatus, EngagementStatuses, nameof(input.EngagementStatus));
    }

    private static int Readiness(SpeakingRequestInput input)
    {
        var checks = new[]
        {
            input.StartDate != default && input.EndDate != default && !string.IsNullOrWhiteSpace(input.VenueName),
            !string.IsNullOrWhiteSpace(input.ContactName) && !string.IsNullOrWhiteSpace(input.ContactEmail) && !string.IsNullOrWhiteSpace(input.ContactPhone),
            !string.Equals(input.TravelCoverageStatus, "not-determined", StringComparison.OrdinalIgnoreCase),
            !string.Equals(input.LodgingCoverageStatus, "not-determined", StringComparison.OrdinalIgnoreCase),
            !string.Equals(input.HonorariumStatus, "not-determined", StringComparison.OrdinalIgnoreCase),
            !string.IsNullOrWhiteSpace(input.MinistryRequest),
            input.ExpectedAttendance > 0
        };
        return (int)Math.Round(checks.Count(x => x) * 100d / checks.Length);
    }

    private static void EnsureReviewable(SpeakingRequestRecord request)
    {
        if (request.Status is "approved" or "declined")
            throw new InvalidOperationException($"Request {request.ReferenceNumber} is already {request.Status}.");
    }

    private static bool HostLinkValid(SpeakingRequestRecord? request) =>
        request is not null &&
        request.Status == "information-needed" &&
        request.EditTokenExpiresAtUtc is DateTimeOffset expires &&
        expires > DateTimeOffset.UtcNow;

    private static SpeakingRequestCommunicationRecord NewCommunication(Guid requestId, string type, string message, string actor, DateTimeOffset now) =>
        new() { Id = Guid.NewGuid(), RequestId = requestId, Type = type, Message = message, Actor = actor, CreatedAtUtc = now };

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();

    private static string Normalize(string? value, HashSet<string> allowed, string field)
    {
        var normalized = Required(value, field).ToLowerInvariant();
        return allowed.Contains(normalized) ? normalized : throw new ArgumentException($"{field} has an unsupported value.");
    }

    private static string BuildLocation(SpeakingRequestRecord request)
    {
        var region = string.IsNullOrWhiteSpace(request.State) ? request.Region : request.State;
        return string.Join(", ", new[] { request.VenueName, request.City, region, request.Country }.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string BuildHostSnapshot(SpeakingRequestRecord request) => $"""
        Host invitation {request.ReferenceNumber}
        Organization: {request.OrganizationName}
        Event: {request.EventName} ({request.EventType})
        Requested ministry: {request.MinistryRequest}
        Dates: {request.StartDate:yyyy-MM-dd} through {request.EndDate:yyyy-MM-dd}
        Venue: {request.VenueName}, {request.VenueAddress}
        Location: {BuildLocation(request)}
        Region / time zone: {request.Region ?? "Not provided"} / {request.TimeZone}
        Primary contact: {request.ContactName} | {request.ContactEmail} | {request.ContactPhone}
        Expected attendance: {request.ExpectedAttendance}
        Travel coverage: {request.TravelCoverageStatus}
        Lodging coverage: {request.LodgingCoverageStatus}
        Travel booked by: {request.TravelBookedBy}
        Honorarium: {request.HonorariumStatus} | {request.HonorariumCurrency} {request.HonorariumAmount:0.00}
        Payment status: {request.PaymentStatus}
        Agreement status: {request.AgreementStatus}
        Engagement status: {request.EngagementStatus}
        Host readiness: {request.ReadinessPercentage}%
        """;

    private static SpeakingRequestDetails Map(SpeakingRequestRecord request) => new(
        request.Id, request.TenantId, request.ReferenceNumber, request.EditToken, request.EditTokenExpiresAtUtc,
        request.OrganizationName, request.EventName, request.EventType,
        request.ContactName, request.ContactEmail, request.ContactPhone,
        request.City, request.State, request.Country, request.Region, request.TimeZone,
        request.VenueAddress, request.VenueName, request.StartDate, request.EndDate,
        request.MinistryRequest, request.ExpectedAttendance,
        request.TravelCoverageStatus, request.LodgingCoverageStatus, request.HonorariumStatus,
        request.TravelBookedBy, request.HonorariumAmount, request.HonorariumCurrency,
        request.PaymentStatus, request.AgreementStatus, request.EngagementStatus,
        request.ReadinessPercentage, request.Status, request.DeclineReason, request.AssignmentId,
        request.SubmittedAtUtc, request.UpdatedAtUtc,
        request.Communications.OrderBy(x => x.CreatedAtUtc)
            .Select(x => new SpeakingRequestCommunicationDto(x.Id, x.Type, x.Message, x.Actor, x.CreatedAtUtc)).ToArray());
}

public static class SpeakingRequestEndpoints
{
    private static readonly string[] Coordinators = ["Administrator", "Coordinator"];

    public static IEndpointRouteBuilder MapSpeakingRequestEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/engagements/requests").AllowAnonymous();
        publicGroup.MapPost("", async (SpeakingRequestInput request, SpeakingRequestsService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CreateAsync(KingdomIdentity.DemoTenantId, request, ct)); }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [exception.Message] }); }
        });
        publicGroup.MapGet("/{token}", async (string token, SpeakingRequestsService service, CancellationToken ct) =>
        {
            var item = await service.GetForHostAsync(token, ct);
            return item is null ? Results.NotFound(new { message = "This host update link is invalid, expired, or no longer needed." }) : Results.Ok(item);
        });
        publicGroup.MapPut("/{token}", async (string token, HostSpeakingRequestUpdate request, SpeakingRequestsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.SubmitHostResponseAsync(token, request, ct);
                return item is null ? Results.NotFound(new { message = "This host update link is invalid, expired, or no longer needed." }) : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [exception.Message] }); }
        });

        var reviewGroup = endpoints.MapGroup("/api/engagements/requests").RequireAuthorization();
        reviewGroup.MapGet("", async (HttpContext context, SpeakingRequestsService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), ct)));
        reviewGroup.MapGet("/{id:guid}", async (Guid id, HttpContext context, SpeakingRequestsService service, CancellationToken ct) =>
        {
            var item = await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });
        reviewGroup.MapPost("/{id:guid}/request-information", async (Guid id, ReviewMessageRequest request, HttpContext context, SpeakingRequestsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.RequestInformationAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request.Message, ct);
                if (item is null) return Results.NotFound();
                var editUrl = $"{context.Request.Scheme}://{context.Request.Host}/invite/apostle-cynthia/requests/{item.EditToken}";
                return Results.Ok(new { request = item, editUrl });
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["message"] = [exception.Message] }); }
            catch (InvalidOperationException exception) { return Results.Conflict(new { message = exception.Message }); }
        }).RequireAuthorization("EngagementsWrite");
        reviewGroup.MapPost("/{id:guid}/decline", async (Guid id, DeclineSpeakingRequest request, HttpContext context, SpeakingRequestsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.DeclineAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request.Reason, ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["reason"] = [exception.Message] }); }
            catch (InvalidOperationException exception) { return Results.Conflict(new { message = exception.Message }); }
        }).RequireAuthorization("EngagementsWrite");
        reviewGroup.MapPost("/{id:guid}/approve", async (Guid id, HttpContext context, SpeakingRequestsService service, CancellationToken ct) =>
        {
            try
            {
                var result = await service.ApproveAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
                return result is null ? Results.NotFound() : Results.Ok(new { request = result.Value.Request, assignmentId = result.Value.AssignmentId });
            }
            catch (InvalidOperationException exception) { return Results.Conflict(new { message = exception.Message }); }
        }).RequireAuthorization("EngagementsWrite");

        return endpoints;
    }
}
