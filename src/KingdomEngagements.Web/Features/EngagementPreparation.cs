using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementPreparationDbContext(DbContextOptions<EngagementPreparationDbContext> options) : DbContext(options)
{
    public DbSet<EngagementPreparationRecord> Preparations => Set<EngagementPreparationRecord>();
    public DbSet<HostCoordinationDocumentRecord> Documents => Set<HostCoordinationDocumentRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var preparation = modelBuilder.Entity<EngagementPreparationRecord>();
        preparation.ToTable("EngagementPreparations");
        preparation.HasKey(x => x.Id);
        preparation.Property(x => x.Id).ValueGeneratedNever();
        preparation.HasIndex(x => new { x.TenantId, x.AssignmentId }).IsUnique();
        preparation.HasIndex(x => x.RequestId).IsUnique();
        preparation.HasIndex(x => x.TermsToken).IsUnique();
        preparation.HasIndex(x => x.CoordinationToken).IsUnique();
        preparation.Property(x => x.ReferenceNumber).HasMaxLength(40).IsRequired();
        preparation.Property(x => x.EventName).HasMaxLength(180).IsRequired();
        preparation.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        preparation.Property(x => x.HostOrganization).HasMaxLength(180).IsRequired();
        preparation.Property(x => x.TermsToken).HasMaxLength(64).IsRequired();
        preparation.Property(x => x.TermsStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.TermsAcceptedByName).HasMaxLength(180);
        preparation.Property(x => x.TermsAcceptedByEmail).HasMaxLength(320);
        preparation.Property(x => x.TermsAcceptanceNote).HasMaxLength(2000);
        preparation.Property(x => x.TravelCoverageStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.LodgingCoverageStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.TravelBookedBy).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.HonorariumStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.HonorariumAmount).HasPrecision(18, 2);
        preparation.Property(x => x.HonorariumCurrency).HasMaxLength(8).IsRequired();
        preparation.Property(x => x.PaymentStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.CoordinationToken).HasMaxLength(64).IsRequired();
        preparation.Property(x => x.CoordinationStatus).HasMaxLength(32).IsRequired();
        preparation.Property(x => x.OutboundAirline).HasMaxLength(120);
        preparation.Property(x => x.OutboundFlightNumber).HasMaxLength(40);
        preparation.Property(x => x.OutboundConfirmationNumber).HasMaxLength(80);
        preparation.Property(x => x.OutboundDepartureAirport).HasMaxLength(120);
        preparation.Property(x => x.OutboundArrivalAirport).HasMaxLength(120);
        preparation.Property(x => x.ReturnAirline).HasMaxLength(120);
        preparation.Property(x => x.ReturnFlightNumber).HasMaxLength(40);
        preparation.Property(x => x.ReturnConfirmationNumber).HasMaxLength(80);
        preparation.Property(x => x.ReturnDepartureAirport).HasMaxLength(120);
        preparation.Property(x => x.ReturnArrivalAirport).HasMaxLength(120);
        preparation.Property(x => x.HotelName).HasMaxLength(180);
        preparation.Property(x => x.HotelAddress).HasMaxLength(500);
        preparation.Property(x => x.HotelConfirmationNumber).HasMaxLength(80);
        preparation.Property(x => x.TransportationPlan).HasMaxLength(3000);
        preparation.Property(x => x.PickupContactName).HasMaxLength(180);
        preparation.Property(x => x.PickupContactPhone).HasMaxLength(60);
        preparation.Property(x => x.ScheduleJson).HasMaxLength(16000).IsRequired();
        preparation.Property(x => x.ContactsJson).HasMaxLength(12000).IsRequired();
        preparation.Property(x => x.PromotionRequirements).HasMaxLength(4000);
        preparation.Property(x => x.PrayerFocus).HasMaxLength(4000);
        preparation.Property(x => x.HostNotes).HasMaxLength(4000);

        var document = modelBuilder.Entity<HostCoordinationDocumentRecord>();
        document.ToTable("EngagementHostCoordinationDocuments");
        document.HasKey(x => x.Id);
        document.Property(x => x.Id).ValueGeneratedNever();
        document.HasIndex(x => x.PreparationId);
        document.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        document.Property(x => x.ContentType).HasMaxLength(180).IsRequired();
        document.Property(x => x.Content).IsRequired();
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
IF OBJECT_ID(N'[dbo].[EngagementPreparations]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementPreparations] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [AssignmentId] uniqueidentifier NOT NULL,
        [RequestId] uniqueidentifier NOT NULL,
        [ReferenceNumber] nvarchar(40) NOT NULL,
        [EventName] nvarchar(180) NOT NULL,
        [EventType] nvarchar(100) NOT NULL,
        [HostOrganization] nvarchar(180) NOT NULL,
        [EventStartDate] date NOT NULL,
        [EventEndDate] date NOT NULL,
        [TermsToken] nvarchar(64) NOT NULL,
        [TermsTokenExpiresAtUtc] datetimeoffset NULL,
        [TermsStatus] nvarchar(32) NOT NULL,
        [TermsAcceptedAtUtc] datetimeoffset NULL,
        [TermsAcceptedByName] nvarchar(180) NULL,
        [TermsAcceptedByEmail] nvarchar(320) NULL,
        [TermsAcceptanceNote] nvarchar(2000) NULL,
        [TravelCoverageStatus] nvarchar(32) NOT NULL,
        [LodgingCoverageStatus] nvarchar(32) NOT NULL,
        [TravelBookedBy] nvarchar(32) NOT NULL,
        [HonorariumStatus] nvarchar(32) NOT NULL,
        [HonorariumAmount] decimal(18,2) NOT NULL,
        [HonorariumCurrency] nvarchar(8) NOT NULL,
        [PaymentStatus] nvarchar(32) NOT NULL,
        [CoordinationToken] nvarchar(64) NOT NULL,
        [CoordinationTokenExpiresAtUtc] datetimeoffset NULL,
        [CoordinationStatus] nvarchar(32) NOT NULL,
        [OutboundAirline] nvarchar(120) NULL,
        [OutboundFlightNumber] nvarchar(40) NULL,
        [OutboundConfirmationNumber] nvarchar(80) NULL,
        [OutboundDepartureAirport] nvarchar(120) NULL,
        [OutboundArrivalAirport] nvarchar(120) NULL,
        [OutboundDepartsAtUtc] datetimeoffset NULL,
        [OutboundArrivesAtUtc] datetimeoffset NULL,
        [ReturnAirline] nvarchar(120) NULL,
        [ReturnFlightNumber] nvarchar(40) NULL,
        [ReturnConfirmationNumber] nvarchar(80) NULL,
        [ReturnDepartureAirport] nvarchar(120) NULL,
        [ReturnArrivalAirport] nvarchar(120) NULL,
        [ReturnDepartsAtUtc] datetimeoffset NULL,
        [ReturnArrivesAtUtc] datetimeoffset NULL,
        [HotelName] nvarchar(180) NULL,
        [HotelAddress] nvarchar(500) NULL,
        [HotelConfirmationNumber] nvarchar(80) NULL,
        [HotelCheckInAtUtc] datetimeoffset NULL,
        [HotelCheckOutAtUtc] datetimeoffset NULL,
        [TransportationPlan] nvarchar(3000) NULL,
        [PickupContactName] nvarchar(180) NULL,
        [PickupContactPhone] nvarchar(60) NULL,
        [ScheduleJson] nvarchar(max) NOT NULL,
        [ContactsJson] nvarchar(max) NOT NULL,
        [PromotionRequirements] nvarchar(4000) NULL,
        [PrayerFocus] nvarchar(4000) NULL,
        [HostNotes] nvarchar(4000) NULL,
        [SubmittedAtUtc] datetimeoffset NULL,
        [CreatedAtUtc] datetimeoffset NOT NULL,
        [UpdatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementPreparations] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_EngagementPreparations_TenantId_AssignmentId]
        ON [dbo].[EngagementPreparations] ([TenantId], [AssignmentId]);
    CREATE UNIQUE INDEX [IX_EngagementPreparations_RequestId]
        ON [dbo].[EngagementPreparations] ([RequestId]);
    CREATE UNIQUE INDEX [IX_EngagementPreparations_TermsToken]
        ON [dbo].[EngagementPreparations] ([TermsToken]);
    CREATE UNIQUE INDEX [IX_EngagementPreparations_CoordinationToken]
        ON [dbo].[EngagementPreparations] ([CoordinationToken]);
END;

IF OBJECT_ID(N'[dbo].[EngagementHostCoordinationDocuments]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementHostCoordinationDocuments] (
        [Id] uniqueidentifier NOT NULL,
        [PreparationId] uniqueidentifier NOT NULL,
        [FileName] nvarchar(260) NOT NULL,
        [ContentType] nvarchar(180) NOT NULL,
        [Length] bigint NOT NULL,
        [Content] varbinary(max) NOT NULL,
        [UploadedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementHostCoordinationDocuments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EngagementHostCoordinationDocuments_EngagementPreparations_PreparationId]
            FOREIGN KEY ([PreparationId]) REFERENCES [dbo].[EngagementPreparations] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_EngagementHostCoordinationDocuments_PreparationId]
        ON [dbo].[EngagementHostCoordinationDocuments] ([PreparationId]);
END;
""";

        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class EngagementPreparationRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public Guid RequestId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string HostOrganization { get; set; } = string.Empty;
    public DateOnly EventStartDate { get; set; }
    public DateOnly EventEndDate { get; set; }
    public string TermsToken { get; set; } = string.Empty;
    public DateTimeOffset? TermsTokenExpiresAtUtc { get; set; }
    public string TermsStatus { get; set; } = "pending";
    public DateTimeOffset? TermsAcceptedAtUtc { get; set; }
    public string? TermsAcceptedByName { get; set; }
    public string? TermsAcceptedByEmail { get; set; }
    public string? TermsAcceptanceNote { get; set; }
    public string TravelCoverageStatus { get; set; } = "not-determined";
    public string LodgingCoverageStatus { get; set; } = "not-determined";
    public string TravelBookedBy { get; set; } = "not-determined";
    public string HonorariumStatus { get; set; } = "not-determined";
    public decimal HonorariumAmount { get; set; }
    public string HonorariumCurrency { get; set; } = "USD";
    public string PaymentStatus { get; set; } = "not-due";
    public string CoordinationToken { get; set; } = string.Empty;
    public DateTimeOffset? CoordinationTokenExpiresAtUtc { get; set; }
    public string CoordinationStatus { get; set; } = "locked";
    public string? OutboundAirline { get; set; }
    public string? OutboundFlightNumber { get; set; }
    public string? OutboundConfirmationNumber { get; set; }
    public string? OutboundDepartureAirport { get; set; }
    public string? OutboundArrivalAirport { get; set; }
    public DateTimeOffset? OutboundDepartsAtUtc { get; set; }
    public DateTimeOffset? OutboundArrivesAtUtc { get; set; }
    public string? ReturnAirline { get; set; }
    public string? ReturnFlightNumber { get; set; }
    public string? ReturnConfirmationNumber { get; set; }
    public string? ReturnDepartureAirport { get; set; }
    public string? ReturnArrivalAirport { get; set; }
    public DateTimeOffset? ReturnDepartsAtUtc { get; set; }
    public DateTimeOffset? ReturnArrivesAtUtc { get; set; }
    public string? HotelName { get; set; }
    public string? HotelAddress { get; set; }
    public string? HotelConfirmationNumber { get; set; }
    public DateTimeOffset? HotelCheckInAtUtc { get; set; }
    public DateTimeOffset? HotelCheckOutAtUtc { get; set; }
    public string? TransportationPlan { get; set; }
    public string? PickupContactName { get; set; }
    public string? PickupContactPhone { get; set; }
    public string ScheduleJson { get; set; } = "[]";
    public string ContactsJson { get; set; } = "[]";
    public string? PromotionRequirements { get; set; }
    public string? PrayerFocus { get; set; }
    public string? HostNotes { get; set; }
    public DateTimeOffset? SubmittedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class HostCoordinationDocumentRecord
{
    public Guid Id { get; set; }
    public Guid PreparationId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long Length { get; set; }
    public byte[] Content { get; set; } = [];
    public DateTimeOffset UploadedAtUtc { get; set; }
}

public sealed record AcceptEngagementTermsRequest(bool Accepted, string SignatoryName, string SignatoryEmail, string? Note);
public sealed record HostScheduleItemInput(string Title, DateOnly Date, string? StartsAt, string? EndsAt, string? Location, string? Notes);
public sealed record HostContactInput(string Type, string Name, string? Email, string? Phone);
public sealed record HostCoordinationUpdate(
    string? OutboundAirline,
    string? OutboundFlightNumber,
    string? OutboundConfirmationNumber,
    string? OutboundDepartureAirport,
    string? OutboundArrivalAirport,
    DateTimeOffset? OutboundDepartsAtUtc,
    DateTimeOffset? OutboundArrivesAtUtc,
    string? ReturnAirline,
    string? ReturnFlightNumber,
    string? ReturnConfirmationNumber,
    string? ReturnDepartureAirport,
    string? ReturnArrivalAirport,
    DateTimeOffset? ReturnDepartsAtUtc,
    DateTimeOffset? ReturnArrivesAtUtc,
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc,
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone,
    IReadOnlyList<HostScheduleItemInput>? Schedule,
    IReadOnlyList<HostContactInput>? Contacts,
    string? PromotionRequirements,
    string? PrayerFocus,
    string? HostNotes,
    bool Submit);

public sealed record HostCoordinationDocumentDto(Guid Id, string FileName, string ContentType, long Length, DateTimeOffset UploadedAtUtc);

public sealed record EngagementTermsDetails(
    Guid AssignmentId,
    string ReferenceNumber,
    string EventName,
    string EventType,
    string HostOrganization,
    DateOnly EventStartDate,
    DateOnly EventEndDate,
    string TermsStatus,
    DateTimeOffset? TermsAcceptedAtUtc,
    string? TermsAcceptedByName,
    string? TermsAcceptedByEmail,
    string TravelCoverageStatus,
    string LodgingCoverageStatus,
    string TravelBookedBy,
    string HonorariumStatus,
    decimal HonorariumAmount,
    string HonorariumCurrency,
    string PaymentStatus,
    string CoordinationStatus,
    string? CoordinationToken);

public sealed record HostCoordinationDetails(
    Guid AssignmentId,
    string ReferenceNumber,
    string EventName,
    string HostOrganization,
    DateOnly EventStartDate,
    DateOnly EventEndDate,
    string CoordinationStatus,
    DateTimeOffset? SubmittedAtUtc,
    string? OutboundAirline,
    string? OutboundFlightNumber,
    string? OutboundConfirmationNumber,
    string? OutboundDepartureAirport,
    string? OutboundArrivalAirport,
    DateTimeOffset? OutboundDepartsAtUtc,
    DateTimeOffset? OutboundArrivesAtUtc,
    string? ReturnAirline,
    string? ReturnFlightNumber,
    string? ReturnConfirmationNumber,
    string? ReturnDepartureAirport,
    string? ReturnArrivalAirport,
    DateTimeOffset? ReturnDepartsAtUtc,
    DateTimeOffset? ReturnArrivesAtUtc,
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc,
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone,
    IReadOnlyList<HostScheduleItemInput> Schedule,
    IReadOnlyList<HostContactInput> Contacts,
    string? PromotionRequirements,
    string? PrayerFocus,
    string? HostNotes,
    IReadOnlyList<HostCoordinationDocumentDto> Documents);

public sealed record EngagementPreparationDetails(
    Guid AssignmentId,
    Guid RequestId,
    string ReferenceNumber,
    string TermsStatus,
    DateTimeOffset? TermsAcceptedAtUtc,
    string? TermsAcceptedByName,
    string CoordinationStatus,
    DateTimeOffset? CoordinationSubmittedAtUtc,
    string TermsToken,
    string CoordinationToken,
    HostCoordinationDetails Coordination);

public sealed class EngagementPreparationService(
    EngagementPreparationDbContext database,
    SpeakingRequestsDbContext requestsDatabase,
    EngagementsDbContext engagementsDatabase)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxDocumentBytes = 10 * 1024 * 1024;

    public async Task<EngagementPreparationDetails?> EnsureAsync(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);

        var existing = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (existing is not null)
            return await MapInternalAsync(existing, cancellationToken);

        var assignmentExists = await engagementsDatabase.Assignments.AsNoTracking()
            .AnyAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (!assignmentExists) return null;

        var request = await requestsDatabase.Requests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.Status == "approved", cancellationToken);
        if (request is null) return null;

        var now = DateTimeOffset.UtcNow;
        var preparation = new EngagementPreparationRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            RequestId = request.Id,
            ReferenceNumber = request.ReferenceNumber,
            EventName = request.EventName,
            EventType = request.EventType,
            HostOrganization = request.OrganizationName,
            EventStartDate = request.StartDate,
            EventEndDate = request.EndDate,
            TermsToken = Guid.NewGuid().ToString("N"),
            TermsTokenExpiresAtUtc = now.AddDays(30),
            TermsStatus = request.AgreementStatus == "signed" ? "accepted" : "pending",
            TermsAcceptedAtUtc = request.AgreementStatus == "signed" ? now : null,
            TravelCoverageStatus = request.TravelCoverageStatus,
            LodgingCoverageStatus = request.LodgingCoverageStatus,
            TravelBookedBy = request.TravelBookedBy,
            HonorariumStatus = request.HonorariumStatus,
            HonorariumAmount = request.HonorariumAmount,
            HonorariumCurrency = request.HonorariumCurrency,
            PaymentStatus = request.PaymentStatus,
            CoordinationToken = Guid.NewGuid().ToString("N"),
            CoordinationTokenExpiresAtUtc = request.AgreementStatus == "signed" ? now.AddDays(30) : null,
            CoordinationStatus = request.AgreementStatus == "signed" ? "in-progress" : "locked",
            ContactsJson = JsonSerializer.Serialize(new[]
            {
                new HostContactInput("primary", request.ContactName, request.ContactEmail, request.ContactPhone)
            }, JsonOptions),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        database.Preparations.Add(preparation);
        await database.SaveChangesAsync(cancellationToken);
        return await MapInternalAsync(preparation, cancellationToken);
    }

    public async Task<EngagementTermsDetails?> GetTermsAsync(string token, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TermsToken == token, cancellationToken);
        if (preparation is null) return null;
        if (preparation.TermsStatus != "accepted" && preparation.TermsTokenExpiresAtUtc <= DateTimeOffset.UtcNow) return null;
        return MapTerms(preparation, includeCoordinationToken: preparation.TermsStatus == "accepted");
    }

    public async Task<EngagementTermsDetails?> AcceptTermsAsync(string token, AcceptEngagementTermsRequest input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        if (!input.Accepted) throw new ArgumentException("The engagement terms must be accepted to continue.");
        var name = Required(input.SignatoryName, nameof(input.SignatoryName));
        var email = Required(input.SignatoryEmail, nameof(input.SignatoryEmail)).ToLowerInvariant();
        if (!email.Contains('@')) throw new ArgumentException("A valid signatory email is required.");

        var preparation = await database.Preparations.SingleOrDefaultAsync(x => x.TermsToken == token, cancellationToken);
        if (preparation is null) return null;
        if (preparation.TermsStatus == "accepted") return MapTerms(preparation, includeCoordinationToken: true);
        if (preparation.TermsTokenExpiresAtUtc <= DateTimeOffset.UtcNow) return null;

        var now = DateTimeOffset.UtcNow;
        preparation.TermsStatus = "accepted";
        preparation.TermsAcceptedAtUtc = now;
        preparation.TermsAcceptedByName = name;
        preparation.TermsAcceptedByEmail = email;
        preparation.TermsAcceptanceNote = Trim(input.Note);
        preparation.TermsTokenExpiresAtUtc = null;
        preparation.CoordinationStatus = "in-progress";
        preparation.CoordinationTokenExpiresAtUtc = now.AddDays(30);
        preparation.UpdatedAtUtc = now;
        await database.SaveChangesAsync(cancellationToken);

        var request = await requestsDatabase.Requests.SingleOrDefaultAsync(x => x.Id == preparation.RequestId, cancellationToken);
        if (request is not null)
        {
            request.AgreementStatus = "signed";
            request.UpdatedAtUtc = now;
            await requestsDatabase.SaveChangesAsync(cancellationToken);
        }

        var assignment = await engagementsDatabase.Assignments
            .Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == preparation.TenantId && x.Id == preparation.AssignmentId, cancellationToken);
        if (assignment is not null)
        {
            assignment.HostStatus = assignment.HostStatus == "confirmed" ? "confirmed" : "in-progress";
            assignment.DocumentsStatus = "in-progress";
            assignment.UpdatedAtUtc = now;
            var agreementTask = assignment.Tasks.FirstOrDefault(x => x.Category == "documents" && x.Title == "Finalize engagement agreement");
            if (agreementTask is not null)
            {
                agreementTask.Status = "complete";
                agreementTask.Detail = $"Accepted by {name} on {now:yyyy-MM-dd}.";
                agreementTask.UpdatedAtUtc = now;
            }
            if (!assignment.Documents.Any(x => x.Category == "agreement" && x.StorageReference == $"terms:{preparation.Id}"))
            {
                assignment.Documents.Add(new EngagementDocument
                {
                    Id = Guid.NewGuid(),
                    Name = "Accepted engagement terms",
                    Category = "agreement",
                    Status = "received",
                    StorageReference = $"terms:{preparation.Id}",
                    UpdatedAtUtc = now
                });
            }
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        return MapTerms(preparation, includeCoordinationToken: true);
    }

    public async Task<HostCoordinationDetails?> GetCoordinationAsync(string token, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        return await MapCoordinationAsync(preparation!, cancellationToken);
    }

    public async Task<HostCoordinationDetails?> SaveCoordinationAsync(string token, HostCoordinationUpdate input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;

        ApplyCoordination(preparation!, input);
        var now = DateTimeOffset.UtcNow;
        preparation!.CoordinationStatus = input.Submit ? "submitted" : "in-progress";
        preparation.SubmittedAtUtc = input.Submit ? now : preparation.SubmittedAtUtc;
        preparation.UpdatedAtUtc = now;
        await database.SaveChangesAsync(cancellationToken);
        await SyncAssignmentAsync(preparation, input.Submit, cancellationToken);
        return await MapCoordinationAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationDocumentDto?> AddDocumentAsync(string token, string fileName, string contentType, byte[] content, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        if (content.Length == 0) throw new ArgumentException("Choose a file to upload.");
        if (content.Length > MaxDocumentBytes) throw new ArgumentException("Host coordination documents must be 10 MB or smaller.");

        var now = DateTimeOffset.UtcNow;
        var document = new HostCoordinationDocumentRecord
        {
            Id = Guid.NewGuid(),
            PreparationId = preparation!.Id,
            FileName = Path.GetFileName(Required(fileName, nameof(fileName))),
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim(),
            Length = content.LongLength,
            Content = content,
            UploadedAtUtc = now
        };
        database.Documents.Add(document);
        preparation.UpdatedAtUtc = now;
        await database.SaveChangesAsync(cancellationToken);

        var assignment = await engagementsDatabase.Assignments.Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == preparation.TenantId && x.Id == preparation.AssignmentId, cancellationToken);
        if (assignment is not null)
        {
            assignment.DocumentsStatus = "received";
            assignment.UpdatedAtUtc = now;
            assignment.Documents.Add(new EngagementDocument
            {
                Id = Guid.NewGuid(),
                Name = document.FileName,
                Category = "host-coordination",
                Status = "received",
                StorageReference = $"coordination-document:{document.Id}",
                UpdatedAtUtc = now
            });
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        return MapDocument(document);
    }

    public async Task<HostCoordinationDocumentRecord?> GetDocumentForHostAsync(string token, Guid documentId, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        return await database.Documents.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PreparationId == preparation!.Id && x.Id == documentId, cancellationToken);
    }

    public async Task<HostCoordinationDocumentRecord?> GetDocumentForAssignmentAsync(Guid tenantId, Guid assignmentId, Guid documentId, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparationId = await database.Preparations.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
        if (preparationId is null) return null;
        return await database.Documents.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PreparationId == preparationId.Value && x.Id == documentId, cancellationToken);
    }

    private async Task SyncAssignmentAsync(EngagementPreparationRecord preparation, bool submitted, CancellationToken cancellationToken)
    {
        var assignment = await engagementsDatabase.Assignments
            .Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == preparation.TenantId && x.Id == preparation.AssignmentId, cancellationToken);
        if (assignment is null) return;

        var now = DateTimeOffset.UtcNow;
        assignment.TravelStatus = TravelComplete(preparation) ? "confirmed" : TravelStarted(preparation) ? "in-progress" : "not-started";
        assignment.LodgingStatus = LodgingComplete(preparation) ? "confirmed" : LodgingStarted(preparation) ? "in-progress" : "not-started";
        assignment.TransportationStatus = TransportationComplete(preparation) ? "confirmed" : TransportationStarted(preparation) ? "in-progress" : "not-started";
        assignment.HostStatus = submitted ? "confirmed" : "in-progress";
        assignment.UpdatedAtUtc = now;

        var primary = DeserializeContacts(preparation.ContactsJson)
            .FirstOrDefault(x => string.Equals(x.Type, "primary", StringComparison.OrdinalIgnoreCase) || string.Equals(x.Type, "host", StringComparison.OrdinalIgnoreCase));
        if (primary is not null)
        {
            assignment.HostContactName = Trim(primary.Name) ?? assignment.HostContactName;
            assignment.HostContactEmail = Trim(primary.Email)?.ToLowerInvariant() ?? assignment.HostContactEmail;
        }

        var hostTask = assignment.Tasks.FirstOrDefault(x => x.Category == "host" && x.Title == "Complete host coordination");
        if (hostTask is not null)
        {
            hostTask.Status = submitted ? "complete" : "in-progress";
            hostTask.Detail = submitted ? "Host coordination submitted through the secure host portal." : "Host coordination is in progress.";
            hostTask.UpdatedAtUtc = now;
        }
        var travelTask = assignment.Tasks.FirstOrDefault(x => x.Category == "travel" && x.Title == "Confirm travel and lodging plan");
        if (travelTask is not null)
        {
            travelTask.Status = TravelComplete(preparation) && LodgingComplete(preparation) ? "complete" : TravelStarted(preparation) || LodgingStarted(preparation) ? "in-progress" : "open";
            travelTask.UpdatedAtUtc = now;
        }
        await engagementsDatabase.SaveChangesAsync(cancellationToken);
    }

    private async Task<EngagementPreparationDetails> MapInternalAsync(EngagementPreparationRecord preparation, CancellationToken cancellationToken) =>
        new(preparation.AssignmentId, preparation.RequestId, preparation.ReferenceNumber,
            preparation.TermsStatus, preparation.TermsAcceptedAtUtc, preparation.TermsAcceptedByName,
            preparation.CoordinationStatus, preparation.SubmittedAtUtc,
            preparation.TermsToken, preparation.CoordinationToken,
            await MapCoordinationAsync(preparation, cancellationToken));

    private async Task<HostCoordinationDetails> MapCoordinationAsync(EngagementPreparationRecord preparation, CancellationToken cancellationToken)
    {
        var documents = await database.Documents.AsNoTracking()
            .Where(x => x.PreparationId == preparation.Id)
            .OrderByDescending(x => x.UploadedAtUtc)
            .ToListAsync(cancellationToken);
        return new HostCoordinationDetails(
            preparation.AssignmentId, preparation.ReferenceNumber, preparation.EventName, preparation.HostOrganization,
            preparation.EventStartDate, preparation.EventEndDate, preparation.CoordinationStatus, preparation.SubmittedAtUtc,
            preparation.OutboundAirline, preparation.OutboundFlightNumber, preparation.OutboundConfirmationNumber,
            preparation.OutboundDepartureAirport, preparation.OutboundArrivalAirport, preparation.OutboundDepartsAtUtc, preparation.OutboundArrivesAtUtc,
            preparation.ReturnAirline, preparation.ReturnFlightNumber, preparation.ReturnConfirmationNumber,
            preparation.ReturnDepartureAirport, preparation.ReturnArrivalAirport, preparation.ReturnDepartsAtUtc, preparation.ReturnArrivesAtUtc,
            preparation.HotelName, preparation.HotelAddress, preparation.HotelConfirmationNumber, preparation.HotelCheckInAtUtc, preparation.HotelCheckOutAtUtc,
            preparation.TransportationPlan, preparation.PickupContactName, preparation.PickupContactPhone,
            DeserializeSchedule(preparation.ScheduleJson), DeserializeContacts(preparation.ContactsJson),
            preparation.PromotionRequirements, preparation.PrayerFocus, preparation.HostNotes,
            documents.Select(MapDocument).ToArray());
    }

    private static EngagementTermsDetails MapTerms(EngagementPreparationRecord preparation, bool includeCoordinationToken) =>
        new(preparation.AssignmentId, preparation.ReferenceNumber, preparation.EventName, preparation.EventType,
            preparation.HostOrganization, preparation.EventStartDate, preparation.EventEndDate,
            preparation.TermsStatus, preparation.TermsAcceptedAtUtc, preparation.TermsAcceptedByName, preparation.TermsAcceptedByEmail,
            preparation.TravelCoverageStatus, preparation.LodgingCoverageStatus, preparation.TravelBookedBy,
            preparation.HonorariumStatus, preparation.HonorariumAmount, preparation.HonorariumCurrency, preparation.PaymentStatus,
            preparation.CoordinationStatus, includeCoordinationToken ? preparation.CoordinationToken : null);

    private static HostCoordinationDocumentDto MapDocument(HostCoordinationDocumentRecord document) =>
        new(document.Id, document.FileName, document.ContentType, document.Length, document.UploadedAtUtc);

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

    private static bool CoordinationLinkValid(EngagementPreparationRecord? preparation) =>
        preparation is not null && preparation.TermsStatus == "accepted" &&
        preparation.CoordinationTokenExpiresAtUtc is DateTimeOffset expires && expires > DateTimeOffset.UtcNow;

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

    private static IReadOnlyList<HostScheduleItemInput> DeserializeSchedule(string json) =>
        JsonSerializer.Deserialize<HostScheduleItemInput[]>(json, JsonOptions) ?? [];

    private static IReadOnlyList<HostContactInput> DeserializeContacts(string json) =>
        JsonSerializer.Deserialize<HostContactInput[]>(json, JsonOptions) ?? [];

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static class EngagementPreparationEndpoints
{
    public static IEndpointRouteBuilder MapEngagementPreparationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/engagements/preparation").AllowAnonymous();
        publicGroup.MapGet("/terms/{token}", async (string token, EngagementPreparationService service, CancellationToken ct) =>
        {
            var item = await service.GetTermsAsync(token, ct);
            return item is null ? Results.NotFound(new { message = "This terms link is invalid or expired." }) : Results.Ok(item);
        });
        publicGroup.MapPost("/terms/{token}/accept", async (string token, AcceptEngagementTermsRequest request, HttpContext context, EngagementPreparationService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.AcceptTermsAsync(token, request, ct);
                if (item is null) return Results.NotFound(new { message = "This terms link is invalid or expired." });
                var coordinationUrl = item.CoordinationToken is null ? null : $"{context.Request.Scheme}://{context.Request.Host}/host/coordination/{item.CoordinationToken}";
                return Results.Ok(new { terms = item, coordinationUrl });
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["terms"] = [exception.Message] });
            }
        });
        publicGroup.MapGet("/coordination/{token}", async (string token, EngagementPreparationService service, CancellationToken ct) =>
        {
            var item = await service.GetCoordinationAsync(token, ct);
            return item is null ? Results.NotFound(new { message = "This host coordination link is locked, invalid, or expired." }) : Results.Ok(item);
        });
        publicGroup.MapPut("/coordination/{token}", async (string token, HostCoordinationUpdate request, EngagementPreparationService service, CancellationToken ct) =>
        {
            var item = await service.SaveCoordinationAsync(token, request, ct);
            return item is null ? Results.NotFound(new { message = "This host coordination link is locked, invalid, or expired." }) : Results.Ok(item);
        });
        publicGroup.MapPost("/coordination/{token}/documents", async (string token, HttpRequest request, EngagementPreparationService service, CancellationToken ct) =>
        {
            try
            {
                if (!request.HasFormContentType) return Results.BadRequest(new { message = "Upload a document using multipart form data." });
                var form = await request.ReadFormAsync(ct);
                var file = form.Files.GetFile("file");
                if (file is null) return Results.BadRequest(new { message = "Choose a file to upload." });
                await using var stream = new MemoryStream();
                await file.CopyToAsync(stream, ct);
                var item = await service.AddDocumentAsync(token, file.FileName, file.ContentType, stream.ToArray(), ct);
                return item is null ? Results.NotFound(new { message = "This host coordination link is locked, invalid, or expired." }) : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
        }).DisableAntiforgery();
        publicGroup.MapGet("/coordination/{token}/documents/{documentId:guid}", async (string token, Guid documentId, bool? download, EngagementPreparationService service, CancellationToken ct) =>
        {
            var document = await service.GetDocumentForHostAsync(token, documentId, ct);
            if (document is null) return Results.NotFound();
            return download is true
                ? Results.File(document.Content, document.ContentType, document.FileName, enableRangeProcessing: true)
                : Results.File(document.Content, document.ContentType, enableRangeProcessing: true);
        });

        var internalGroup = endpoints.MapGroup("/api/engagements/assignments").RequireAuthorization();
        internalGroup.MapGet("/{id:guid}/preparation", async (Guid id, HttpContext context, EngagementPreparationService service, CancellationToken ct) =>
        {
            var item = await service.EnsureAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            if (item is null) return Results.NotFound(new { message = "This assignment was not created from an approved speaking invitation." });
            var termsUrl = $"{context.Request.Scheme}://{context.Request.Host}/host/terms/{item.TermsToken}";
            var coordinationUrl = item.TermsStatus == "accepted"
                ? $"{context.Request.Scheme}://{context.Request.Host}/host/coordination/{item.CoordinationToken}"
                : null;
            return Results.Ok(new { preparation = item, termsUrl, coordinationUrl });
        });
        internalGroup.MapGet("/{id:guid}/preparation/documents/{documentId:guid}", async (Guid id, Guid documentId, bool? download, HttpContext context, EngagementPreparationService service, CancellationToken ct) =>
        {
            var document = await service.GetDocumentForAssignmentAsync(KingdomIdentity.TenantId(context.User, context.Request), id, documentId, ct);
            if (document is null) return Results.NotFound();
            return download is true
                ? Results.File(document.Content, document.ContentType, document.FileName, enableRangeProcessing: true)
                : Results.File(document.Content, document.ContentType, enableRangeProcessing: true);
        });
        return endpoints;
    }
}
