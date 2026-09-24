using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementPreparationDbContext(
    DbContextOptions<EngagementPreparationDbContext> options,
    ICurrentTenantAccessor? tenantAccessor = null)
    : TenantFilteredDbContext(options, tenantAccessor)
{
    public DbSet<EngagementPreparationRecord> Preparations => Set<EngagementPreparationRecord>();
    public DbSet<HostCoordinationDocumentRecord> Documents => Set<HostCoordinationDocumentRecord>();
    public DbSet<HostCoordinationMessageRecord> Messages => Set<HostCoordinationMessageRecord>();

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
        preparation.Property(x => x.MinistryPreparationNotes).HasColumnType("nvarchar(max)");
        preparation.Property(x => x.HospitalityNotes).HasColumnType("nvarchar(max)");
        preparation.Property(x => x.HostNotes).HasMaxLength(4000);

        var document = modelBuilder.Entity<HostCoordinationDocumentRecord>();
        document.ToTable("EngagementHostCoordinationDocuments");
        document.HasKey(x => x.Id);
        document.Property(x => x.Id).ValueGeneratedNever();
        document.HasIndex(x => x.PreparationId);
        document.Property(x => x.FileName).HasMaxLength(260).IsRequired();
        document.Property(x => x.Category).HasMaxLength(80).IsRequired();
        document.Property(x => x.ContentType).HasMaxLength(180).IsRequired();
        document.Property(x => x.StorageProvider).HasMaxLength(40).IsRequired();
        document.Property(x => x.StorageKey).HasMaxLength(900);
        document.Property(x => x.Content).IsRequired();
        document.HasOne(x => x.Preparation).WithMany()
            .HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Cascade);

        var message = modelBuilder.Entity<HostCoordinationMessageRecord>();
        message.ToTable("EngagementHostCoordinationMessages");
        message.HasKey(x => x.Id);
        message.Property(x => x.Id).ValueGeneratedNever();
        message.HasIndex(x => new { x.PreparationId, x.CreatedAtUtc });
        message.Property(x => x.SenderType).HasMaxLength(32).IsRequired();
        message.Property(x => x.SenderName).HasMaxLength(180).IsRequired();
        message.Property(x => x.Message).HasMaxLength(4000).IsRequired();
        message.HasOne(x => x.Preparation).WithMany()
            .HasForeignKey(x => x.PreparationId).OnDelete(DeleteBehavior.Cascade);

        preparation.HasQueryFilter(x =>
            TenantFilterBypassed || x.TenantId == CurrentTenantId);
        document.HasQueryFilter(x =>
            TenantFilterBypassed ||
            (x.Preparation != null && x.Preparation.TenantId == CurrentTenantId));
        message.HasQueryFilter(x =>
            TenantFilterBypassed ||
            (x.Preparation != null && x.Preparation.TenantId == CurrentTenantId));
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
        [MinistryPreparationNotes] nvarchar(max) NULL,
        [HospitalityNotes] nvarchar(max) NULL,
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
        [Category] nvarchar(80) NOT NULL,
        [ContentType] nvarchar(180) NOT NULL,
        [Length] bigint NOT NULL,
        [StorageProvider] nvarchar(40) NOT NULL CONSTRAINT [DF_EngagementHostCoordinationDocuments_StorageProvider] DEFAULT N'database',
        [StorageKey] nvarchar(900) NULL,
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

        const string laneColumnsSql = """
IF COL_LENGTH(N'dbo.EngagementPreparations', N'MinistryPreparationNotes') IS NULL
    ALTER TABLE [dbo].[EngagementPreparations] ADD [MinistryPreparationNotes] nvarchar(max) NULL;

IF COL_LENGTH(N'dbo.EngagementPreparations', N'HospitalityNotes') IS NULL
    ALTER TABLE [dbo].[EngagementPreparations] ADD [HospitalityNotes] nvarchar(max) NULL;

IF COL_LENGTH(N'dbo.EngagementHostCoordinationDocuments', N'Category') IS NULL
BEGIN
    ALTER TABLE [dbo].[EngagementHostCoordinationDocuments]
        ADD [Category] nvarchar(80) NOT NULL
        CONSTRAINT [DF_EngagementHostCoordinationDocuments_Category]
        DEFAULT N'host-coordination' WITH VALUES;
END;

IF COL_LENGTH(N'dbo.EngagementHostCoordinationDocuments', N'StorageProvider') IS NULL
BEGIN
    ALTER TABLE [dbo].[EngagementHostCoordinationDocuments]
        ADD [StorageProvider] nvarchar(40) NOT NULL
        CONSTRAINT [DF_EngagementHostCoordinationDocuments_StorageProvider]
        DEFAULT N'database' WITH VALUES;
END;

IF COL_LENGTH(N'dbo.EngagementHostCoordinationDocuments', N'StorageKey') IS NULL
    ALTER TABLE [dbo].[EngagementHostCoordinationDocuments] ADD [StorageKey] nvarchar(900) NULL;
""";
        await Database.ExecuteSqlRawAsync(laneColumnsSql, cancellationToken);

        const string messageSql = """
IF OBJECT_ID(N'[dbo].[EngagementHostCoordinationMessages]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementHostCoordinationMessages] (
        [Id] uniqueidentifier NOT NULL,
        [PreparationId] uniqueidentifier NOT NULL,
        [SenderType] nvarchar(32) NOT NULL,
        [SenderName] nvarchar(180) NOT NULL,
        [Message] nvarchar(4000) NOT NULL,
        [CreatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementHostCoordinationMessages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EngagementHostCoordinationMessages_EngagementPreparations_PreparationId]
            FOREIGN KEY ([PreparationId]) REFERENCES [dbo].[EngagementPreparations] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_EngagementHostCoordinationMessages_PreparationId_CreatedAtUtc]
        ON [dbo].[EngagementHostCoordinationMessages] ([PreparationId], [CreatedAtUtc]);
END;
""";

        await Database.ExecuteSqlRawAsync(messageSql, cancellationToken);
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
    public string? MinistryPreparationNotes { get; set; }
    public string? HospitalityNotes { get; set; }
    public string? HostNotes { get; set; }
    public DateTimeOffset? SubmittedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class HostCoordinationDocumentRecord
{
    public Guid Id { get; set; }
    public Guid PreparationId { get; set; }
    public EngagementPreparationRecord? Preparation { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Category { get; set; } = "host-coordination";
    public string ContentType { get; set; } = "application/octet-stream";
    public long Length { get; set; }
    public string StorageProvider { get; set; } = "database";
    public string? StorageKey { get; set; }
    public byte[] Content { get; set; } = [];
    public DateTimeOffset UploadedAtUtc { get; set; }
}

public sealed class HostCoordinationMessageRecord
{
    public Guid Id { get; set; }
    public Guid PreparationId { get; set; }
    public string SenderType { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public EngagementPreparationRecord? Preparation { get; set; }
}

public sealed record HostCoordinationMessageDto(
    Guid Id,
    string SenderType,
    string SenderName,
    string Message,
    DateTimeOffset CreatedAtUtc);

public sealed record HostCoordinationThread(
    bool IsClosed,
    IReadOnlyList<HostCoordinationMessageDto> Messages);

public sealed record PostHostCoordinationMessageRequest(string SenderName, string Message);
public sealed record PostMinistryCoordinationMessageRequest(string Message);

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

public sealed record HostCoordinationDocumentDto(
    Guid Id,
    string FileName,
    string Category,
    string ContentType,
    long Length,
    DateTimeOffset UploadedAtUtc);

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
    EngagementsDbContext engagementsDatabase,
    IEngagementDocumentStorage? documentStorage = null,
    ICurrentTenantAccessor? tenantAccessor = null)
{
    private readonly IEngagementDocumentStorage _documentStorage =
        documentStorage ?? DatabaseEngagementDocumentStorage.Instance;
    private readonly ICurrentTenantAccessor _tenantAccessor =
        tenantAccessor ?? NoCurrentTenantAccessor.Instance;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxDocumentBytes = 10 * 1024 * 1024;

    public async Task<EngagementPreparationDetails?> EnsureAsync(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken)
    {
        using var tenantScope = _tenantAccessor.BeginTenant(tenantId, "ensure engagement preparation");
        await database.EnsureSchemaAsync(cancellationToken);
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);

        var existing = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (existing is not null)
            return await MapInternalAsync(existing, cancellationToken);

        var assignment = await engagementsDatabase.Assignments.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is null) return null;

        var request = await requestsDatabase.Requests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.Status == "approved", cancellationToken);

        var now = DateTimeOffset.UtcNow;
        EngagementPreparationRecord preparation;
        if (request is not null)
        {
            preparation = new EngagementPreparationRecord
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
        }
        else
        {
            var startAt = assignment.StartsAtUtc ?? now;
            var endAt = assignment.EndsAtUtc ?? assignment.StartsAtUtc ?? startAt;
            var startDate = DateOnly.FromDateTime(startAt.UtcDateTime);
            var endDate = DateOnly.FromDateTime(endAt.UtcDateTime);
            if (endDate < startDate) endDate = startDate;
            var reference = assignment.ExternalAssignmentId.Length <= 40
                ? assignment.ExternalAssignmentId
                : $"ENG-{assignment.Id:N}";
            var contacts = string.IsNullOrWhiteSpace(assignment.HostContactName) && string.IsNullOrWhiteSpace(assignment.HostContactEmail)
                ? Array.Empty<HostContactInput>()
                : new[]
                {
                    new HostContactInput(
                        "primary",
                        assignment.HostContactName ?? assignment.HostOrganization,
                        assignment.HostContactEmail,
                        null)
                };

            preparation = new EngagementPreparationRecord
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AssignmentId = assignmentId,
                // Manual/global-booking engagements have no SpeakingRequest row. The assignment
                // id is a stable, unique lineage key without manufacturing a duplicate invitation.
                RequestId = assignment.Id,
                ReferenceNumber = reference,
                EventName = assignment.Title,
                EventType = "Engagement",
                HostOrganization = assignment.HostOrganization,
                EventStartDate = startDate,
                EventEndDate = endDate,
                TermsToken = Guid.NewGuid().ToString("N"),
                TermsTokenExpiresAtUtc = now.AddDays(30),
                TermsStatus = "pending",
                TravelCoverageStatus = "not-determined",
                LodgingCoverageStatus = "not-determined",
                TravelBookedBy = "not-determined",
                HonorariumStatus = "not-determined",
                HonorariumAmount = 0m,
                HonorariumCurrency = "USD",
                PaymentStatus = "not-due",
                CoordinationToken = Guid.NewGuid().ToString("N"),
                CoordinationStatus = "locked",
                ContactsJson = JsonSerializer.Serialize(contacts, JsonOptions),
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
        }

        database.Preparations.Add(preparation);
        await database.SaveChangesAsync(cancellationToken);
        return await MapInternalAsync(preparation, cancellationToken);
    }

    public async Task<EngagementTermsDetails?> GetTermsAsync(string token, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await FindPreparationByTermsTokenAsync(token, tracking: false, cancellationToken);
        if (preparation is null) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation.TenantId,
            "read engagement terms through capability token");
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

        var preparation = await FindPreparationByTermsTokenAsync(token, tracking: true, cancellationToken);
        if (preparation is null) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation.TenantId,
            "accept engagement terms through capability token");
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
        var preparation = await FindPreparationByCoordinationTokenAsync(token, tracking: false, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "read host coordination through capability token");
        return await MapCoordinationAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationDetails?> SaveCoordinationAsync(string token, HostCoordinationUpdate input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await FindPreparationByCoordinationTokenAsync(token, tracking: true, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "update host coordination through capability token");

        ApplyCoordination(preparation, input);
        var now = DateTimeOffset.UtcNow;
        preparation!.CoordinationStatus = input.Submit ? "submitted" : "in-progress";
        preparation.SubmittedAtUtc = input.Submit ? now : preparation.SubmittedAtUtc;
        preparation.UpdatedAtUtc = now;
        await database.SaveChangesAsync(cancellationToken);
        await SyncAssignmentAsync(preparation, input.Submit, cancellationToken);
        return await MapCoordinationAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationThread?> GetMessagesForHostAsync(
        string token,
        CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "read host coordination messages through capability token");

        return await MapMessageThreadAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationThread?> AddHostMessageAsync(
        string token,
        PostHostCoordinationMessageRequest request,
        CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations
            .SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "mutate host coordination through capability token");
        if (string.Equals(preparation.CoordinationStatus, "submitted", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Host coordination is complete and this conversation is closed.");

        AddMessage(
            preparation,
            "host",
            Required(request.SenderName, nameof(request.SenderName)),
            RequiredMessage(request.Message));

        await database.SaveChangesAsync(cancellationToken);
        return await MapMessageThreadAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationThread?> GetMessagesForAssignmentAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        using var tenantScope = _tenantAccessor.BeginTenant(tenantId, "read assignment coordination messages");
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.AssignmentId == assignmentId,
                cancellationToken);
        return preparation is null
            ? null
            : await MapMessageThreadAsync(preparation, cancellationToken);
    }

    public async Task<HostCoordinationThread?> AddMinistryMessageAsync(
        Guid tenantId,
        Guid assignmentId,
        string senderName,
        PostMinistryCoordinationMessageRequest request,
        CancellationToken cancellationToken)
    {
        using var tenantScope = _tenantAccessor.BeginTenant(tenantId, "add ministry coordination message");
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await database.Preparations
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.AssignmentId == assignmentId,
                cancellationToken);
        if (preparation is null) return null;
        if (string.Equals(preparation.CoordinationStatus, "submitted", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Host coordination is complete and this conversation is closed.");

        AddMessage(
            preparation,
            "ministry",
            Required(senderName, nameof(senderName)),
            RequiredMessage(request.Message));

        await database.SaveChangesAsync(cancellationToken);
        return await MapMessageThreadAsync(preparation, cancellationToken);
    }

    public Task<HostCoordinationDocumentDto?> AddDocumentAsync(
        string token,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken) =>
        AddDocumentAsync(token, fileName, contentType, content, "host-coordination", cancellationToken);

    public async Task<HostCoordinationDocumentDto?> AddDocumentAsync(
        string token,
        string fileName,
        string contentType,
        byte[] content,
        string? category,
        CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var preparation = await FindPreparationByCoordinationTokenAsync(token, tracking: true, cancellationToken);
        if (!CoordinationLinkValid(preparation)) return null;
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "upload host coordination document through capability token");
        if (content.Length == 0) throw new ArgumentException("Choose a file to upload.");
        if (content.Length > MaxDocumentBytes) throw new ArgumentException("Host coordination documents must be 10 MB or smaller.");

        var normalizedCategory = NormalizeDocumentCategory(category);
        var now = DateTimeOffset.UtcNow;
        var documentId = Guid.NewGuid();
        var normalizedContentType =
            string.IsNullOrWhiteSpace(contentType)
                ? "application/octet-stream"
                : contentType.Trim();

        var stored = await _documentStorage.StoreAsync(
            new EngagementDocumentStorageRequest(
                preparation!.TenantId,
                preparation.AssignmentId,
                documentId,
                normalizedContentType,
                content),
            cancellationToken);

        var document = new HostCoordinationDocumentRecord
        {
            Id = documentId,
            PreparationId = preparation.Id,
            FileName = Path.GetFileName(Required(fileName, nameof(fileName))),
            Category = normalizedCategory,
            ContentType = normalizedContentType,
            Length = content.LongLength,
            StorageProvider = stored.Provider,
            StorageKey = stored.StorageKey,
            Content = stored.InlineContent,
            UploadedAtUtc = now
        };

        database.Documents.Add(document);
        preparation.UpdatedAtUtc = now;

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await _documentStorage.DeleteAsync(document, CancellationToken.None);
            throw;
        }

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
                Category = document.Category,
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
        using var tenantScope = _tenantAccessor.BeginTenant(
            preparation!.TenantId,
            "download host coordination document through capability token");
        var document = await database.Documents.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PreparationId == preparation!.Id && x.Id == documentId, cancellationToken);
        if (document is null) return null;

        document.Content = await _documentStorage.ReadAsync(document, cancellationToken);
        return document;
    }

    public async Task<HostCoordinationDocumentRecord?> GetDocumentForAssignmentAsync(Guid tenantId, Guid assignmentId, Guid documentId, CancellationToken cancellationToken)
    {
        using var tenantScope = _tenantAccessor.BeginTenant(tenantId, "read assignment coordination document");
        await database.EnsureSchemaAsync(cancellationToken);
        var preparationId = await database.Preparations.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
        if (preparationId is null) return null;

        var document = await database.Documents.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PreparationId == preparationId.Value && x.Id == documentId, cancellationToken);
        if (document is null) return null;

        document.Content = await _documentStorage.ReadAsync(document, cancellationToken);
        return document;
    }

    private async Task<EngagementPreparationRecord?> FindPreparationByTermsTokenAsync(
        string token,
        bool tracking,
        CancellationToken cancellationToken)
    {
        return await FindPreparationByCapabilityTokenAsync(
            token,
            tracking,
            termsToken: true,
            cancellationToken);
    }

    private async Task<EngagementPreparationRecord?> FindPreparationByCoordinationTokenAsync(
        string token,
        bool tracking,
        CancellationToken cancellationToken)
    {
        return await FindPreparationByCapabilityTokenAsync(
            token,
            tracking,
            termsToken: false,
            cancellationToken);
    }

    private async Task<EngagementPreparationRecord?> FindPreparationByCapabilityTokenAsync(
        string token,
        bool tracking,
        bool termsToken,
        CancellationToken cancellationToken)
    {
        IQueryable<EngagementPreparationRecord> Query() =>
            tracking ? database.Preparations : database.Preparations.AsNoTracking();

        if (_tenantAccessor.TenantId is not null)
        {
            return termsToken
                ? await Query().SingleOrDefaultAsync(x => x.TermsToken == token, cancellationToken)
                : await Query().SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
        }

        using var bypass = _tenantAccessor.BeginFilterBypass(
            termsToken
                ? "resolve engagement tenant from an exact terms capability token"
                : "resolve engagement tenant from an exact coordination capability token");

        return termsToken
            ? await Query().SingleOrDefaultAsync(x => x.TermsToken == token, cancellationToken)
            : await Query().SingleOrDefaultAsync(x => x.CoordinationToken == token, cancellationToken);
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
        new(
            document.Id,
            document.FileName,
            document.Category,
            document.ContentType,
            document.Length,
            document.UploadedAtUtc);

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

    private async Task<HostCoordinationThread> MapMessageThreadAsync(
        EngagementPreparationRecord preparation,
        CancellationToken cancellationToken)
    {
        var messages = await database.Messages.AsNoTracking()
            .Where(x => x.PreparationId == preparation.Id)
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new HostCoordinationMessageDto(
                x.Id,
                x.SenderType,
                x.SenderName,
                x.Message,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new HostCoordinationThread(
            string.Equals(preparation.CoordinationStatus, "submitted", StringComparison.OrdinalIgnoreCase),
            messages);
    }

    private void AddMessage(
        EngagementPreparationRecord preparation,
        string senderType,
        string senderName,
        string message)
    {
        var now = DateTimeOffset.UtcNow;
        database.Messages.Add(new HostCoordinationMessageRecord
        {
            Id = Guid.NewGuid(),
            PreparationId = preparation.Id,
            SenderType = senderType,
            SenderName = senderName,
            Message = message,
            CreatedAtUtc = now
        });
        preparation.UpdatedAtUtc = now;
    }

    private static string RequiredMessage(string? value)
    {
        var message = Required(value, "message");
        return message.Length <= 4000
            ? message
            : throw new ArgumentException("Messages must be 4,000 characters or fewer.");
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

    private static string NormalizeDocumentCategory(string? value)
    {
        var category = string.IsNullOrWhiteSpace(value)
            ? "host-coordination"
            : EngagementResponsibilityLanes.Normalize(value);

        return category switch
        {
            "host-coordination" or
            "travel" or
            "lodging" or
            "transportation" or
            "media" or
            "program" or
            "documents" or
            "hospitality" => category,
            _ => throw new ArgumentException("The host document category is not supported.")
        };
    }

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
        publicGroup.MapGet("/coordination/{token}/messages", async (
            string token,
            EngagementPreparationService service,
            CancellationToken ct) =>
        {
            var thread = await service.GetMessagesForHostAsync(token, ct);
            return thread is null
                ? Results.NotFound(new { message = "This host coordination link is locked, invalid, or expired." })
                : Results.Ok(thread);
        });
        publicGroup.MapPost("/coordination/{token}/messages", async (
            string token,
            PostHostCoordinationMessageRequest request,
            EngagementPreparationService service,
            CancellationToken ct) =>
        {
            try
            {
                var thread = await service.AddHostMessageAsync(token, request, ct);
                return thread is null
                    ? Results.NotFound(new { message = "This host coordination link is locked, invalid, or expired." })
                    : Results.Ok(thread);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["message"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
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
                var category = form["category"].FirstOrDefault();
                var item = await service.AddDocumentAsync(
                    token,
                    file.FileName,
                    file.ContentType,
                    stream.ToArray(),
                    category,
                    ct);
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
            if (item is null) return Results.NotFound(new { message = "Assignment preparation could not be initialized." });
            var safePreparation = item with
            {
                TermsToken = string.Empty,
                CoordinationToken = string.Empty
            };

            return Results.Ok(new
            {
                preparation = safePreparation,
                termsUrl = (string?)null,
                coordinationUrl = (string?)null
            });
        }).RequireAuthorization("EngagementsDirect");
        internalGroup.MapGet("/{id:guid}/preparation/messages", async (
            Guid id,
            HttpContext context,
            EngagementPreparationService service,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var subject = KingdomIdentity.Subject(context.User, context.Request);
            var allowed = KingdomIdentity.CanDirectEngagements(context.User) ||
                          await responsibilities.IsEffectiveOwnerAsync(
                              tenantId,
                              id,
                              "host-coordination",
                              subject,
                              ct);
            if (!allowed) return Results.Forbid();

            var thread = await service.GetMessagesForAssignmentAsync(tenantId, id, ct);
            return thread is null ? Results.NotFound() : Results.Ok(thread);
        });
        internalGroup.MapPost("/{id:guid}/preparation/messages", async (
            Guid id,
            PostMinistryCoordinationMessageRequest request,
            HttpContext context,
            EngagementPreparationService service,
            EngagementResponsibilityService responsibilities,
            EngagementRealtimePublisher realtime,
            CancellationToken ct) =>
        {
            try
            {
                var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
                var subject = KingdomIdentity.Subject(context.User, context.Request);
                var allowed = KingdomIdentity.CanDirectEngagements(context.User) ||
                              await responsibilities.IsEffectiveOwnerAsync(
                                  tenantId,
                                  id,
                                  "host-coordination",
                                  subject,
                                  ct);
                if (!allowed) return Results.Forbid();

                var thread = await service.AddMinistryMessageAsync(
                    tenantId,
                    id,
                    context.User.Identity?.Name ?? "Engagement team member",
                    request,
                    ct);

                if (thread is null) return Results.NotFound();

                var createdMessage = thread.Messages.LastOrDefault();
                if (createdMessage is not null)
                {
                    await realtime.MessageCreatedAsync(
                        tenantId,
                        id,
                        createdMessage,
                        ct);
                }

                return Results.Ok(thread);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["message"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        internalGroup.MapGet("/{id:guid}/preparation/documents/{documentId:guid}", async (Guid id, Guid documentId, bool? download, HttpContext context, EngagementPreparationService service, CancellationToken ct) =>
        {
            var document = await service.GetDocumentForAssignmentAsync(KingdomIdentity.TenantId(context.User, context.Request), id, documentId, ct);
            if (document is null) return Results.NotFound();
            return download is true
                ? Results.File(document.Content, document.ContentType, document.FileName, enableRangeProcessing: true)
                : Results.File(document.Content, document.ContentType, enableRangeProcessing: true);
        }).RequireAuthorization("EngagementsDirect");
        return endpoints;
    }
}
