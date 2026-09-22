using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed record LaneContactView(
    string Type,
    string Name,
    string? Email,
    string? Phone,
    bool Editable);

public sealed record TravelLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
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
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateTravelLaneRequest(
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
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record LodgingLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateLodgingLaneRequest(
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record TransportationLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateTransportationLaneRequest(
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record ProgramLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    IReadOnlyList<HostScheduleItemInput> Schedule,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateProgramLaneRequest(
    IReadOnlyList<HostScheduleItemInput>? Schedule,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record MediaAssetDto(
    Guid Id,
    Guid AssignmentId,
    string Name,
    string AssetType,
    string Purpose,
    string Status,
    string Source,
    string? StorageReference,
    string? ExternalUrl,
    string? Notes,
    string UpdatedByName,
    DateTimeOffset UpdatedAtUtc,
    DateTimeOffset CreatedAtUtc);

public sealed record MediaLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string? PromotionRequirements,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<MediaAssetDto> Assets,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateMediaLaneRequest(
    string? PromotionRequirements,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record CreateMediaAssetRequest(
    string Name,
    string AssetType,
    string Purpose,
    string Status,
    string Source,
    string? StorageReference,
    string? ExternalUrl,
    string? Notes);

public sealed record UpdateMediaAssetRequest(
    string Name,
    string AssetType,
    string Purpose,
    string Status,
    string Source,
    string? StorageReference,
    string? ExternalUrl,
    string? Notes);

public sealed record LaneDocumentDto(
    Guid Id,
    string Name,
    string Category,
    string Status,
    string? StorageReference,
    DateTimeOffset UpdatedAtUtc);

public sealed record DocumentsLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record CreateLaneDocumentRequest(
    string Name,
    string Status,
    string? StorageReference);

public sealed record UpdateLaneDocumentRequest(
    string Status,
    string? StorageReference);

public sealed record FinanceLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string TravelCoverageStatus,
    string LodgingCoverageStatus,
    string TravelBookedBy,
    string HonorariumStatus,
    decimal HonorariumAmount,
    string HonorariumCurrency,
    string PaymentStatus);

public sealed record UpdateFinanceLaneRequest(
    string TravelCoverageStatus,
    string LodgingCoverageStatus,
    string TravelBookedBy,
    string HonorariumStatus,
    decimal HonorariumAmount,
    string HonorariumCurrency,
    string PaymentStatus);

public sealed record MinistryPreparationLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string? PrayerFocus,
    string? MinistryPreparationNotes);

public sealed record UpdateMinistryPreparationLaneRequest(
    string? PrayerFocus,
    string? MinistryPreparationNotes);

public sealed record HospitalityLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string? HospitalityNotes,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateHospitalityLaneRequest(
    string? HospitalityNotes,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record HostCoordinationLaneDetails(
    Guid AssignmentId,
    ResponsibilityLaneState Lane,
    string CoordinationStatus,
    DateTimeOffset? SubmittedAtUtc,
    string? HostNotes,
    IReadOnlyList<LaneContactView> Contacts,
    IReadOnlyList<LaneDocumentDto> Documents);

public sealed record UpdateHostCoordinationLaneRequest(
    string? HostNotes,
    IReadOnlyList<HostContactInput>? Contacts);

public sealed record ExecutiveTravelSnapshot(
    string? OutboundAirline,
    string? OutboundFlightNumber,
    string? OutboundDepartureAirport,
    string? OutboundArrivalAirport,
    DateTimeOffset? OutboundDepartsAtUtc,
    string? ReturnAirline,
    string? ReturnFlightNumber,
    string? ReturnDepartureAirport,
    string? ReturnArrivalAirport,
    DateTimeOffset? ReturnDepartsAtUtc);

public sealed record ExecutiveLodgingSnapshot(
    string? HotelName,
    string? HotelAddress,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc);

public sealed record ExecutiveTransportationSnapshot(
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone);

public sealed record ExecutiveEngagementBrief(
    Guid AssignmentId,
    string TermsStatus,
    string CoordinationStatus,
    DateTimeOffset? CoordinationSubmittedAtUtc,
    ExecutiveTravelSnapshot Travel,
    ExecutiveLodgingSnapshot Lodging,
    ExecutiveTransportationSnapshot Transportation,
    IReadOnlyList<HostScheduleItemInput> Schedule,
    IReadOnlyList<HostContactInput> Contacts,
    string? PrayerFocus,
    AssignmentReadinessRadar Readiness,
    IReadOnlyList<AssignmentActivityItem> Activity);

public sealed class EngagementMediaAsset
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = "other";
    public string Purpose { get; set; } = string.Empty;
    public string Status { get; set; } = "requested";
    public string Source { get; set; } = "ministry";
    public string? StorageReference { get; set; }
    public string? ExternalUrl { get; set; }
    public string? Notes { get; set; }
    public string UpdatedBySubject { get; set; } = string.Empty;
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed class EngagementLaneWorkspaceService(
    EngagementPreparationDbContext preparationDatabase,
    EngagementsDbContext engagementsDatabase,
    AssignmentWorkspaceDbContext activityDatabase,
    EngagementPreparationService preparationService,
    AssignmentWorkspaceService workspaceService,
    EngagementResponsibilityService responsibilities)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly IReadOnlyDictionary<string, HashSet<string>> EditableContactTypes =
        new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["travel"] = Set("travel", "airline"),
            ["lodging"] = Set("lodging", "hotel"),
            ["transportation"] = Set("transportation", "driver", "pickup"),
            ["media"] = Set("media", "communications", "press", "creative"),
            ["program"] = Set("program", "schedule", "venue"),
            ["hospitality"] = Set("hospitality", "catering", "green-room"),
            ["host-coordination"] = Set("primary", "host", "venue", "general")
        };

    private static readonly HashSet<string> SharedContactTypes = Set("primary", "host");

    private static readonly HashSet<string> MediaAssetTypes =
        Set("image", "video", "document", "audio", "link", "other");

    private static readonly HashSet<string> MediaAssetStatuses =
        Set("requested", "waiting-on-host", "received", "in-review", "approved", "ready", "archived");

    private static readonly HashSet<string> MediaAssetSources =
        Set("host", "ministry", "third-party");

    private static readonly HashSet<string> DocumentStatuses =
        Set("requested", "waiting-on-host", "received", "in-review", "approved", "complete", "waived");

    private static readonly HashSet<string> ExecutiveActivityKinds =
        Set(
            "terms-accepted",
            "coordination-submitted",
            "document-received",
            "readiness-task",
            "travel-updated",
            "lodging-updated",
            "transportation-updated",
            "program-updated",
            "media-updated",
            "media-asset-added",
            "media-asset-updated",
            "ministry-preparation-updated",
            "hospitality-updated",
            "host-coordination-updated");



    public async Task<ExecutiveEngagementBrief?> GetExecutiveBriefAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        var workspace = await workspaceService.GetAsync(tenantId, assignmentId, cancellationToken);
        if (workspace is null) return null;

        var coordination = workspace.Preparation.Coordination;
        var executiveContacts = coordination.Contacts
            .Where(contact =>
                Normalize(contact.Type) is "primary" or "host" or "venue")
            .ToArray();
        var executiveActivity = workspace.Activity
            .Where(item => ExecutiveActivityKinds.Contains(item.Kind))
            .Take(20)
            .ToArray();

        return new ExecutiveEngagementBrief(
            assignmentId,
            workspace.Preparation.TermsStatus,
            workspace.Preparation.CoordinationStatus,
            workspace.Preparation.CoordinationSubmittedAtUtc,
            new ExecutiveTravelSnapshot(
                coordination.OutboundAirline,
                coordination.OutboundFlightNumber,
                coordination.OutboundDepartureAirport,
                coordination.OutboundArrivalAirport,
                coordination.OutboundDepartsAtUtc,
                coordination.ReturnAirline,
                coordination.ReturnFlightNumber,
                coordination.ReturnDepartureAirport,
                coordination.ReturnArrivalAirport,
                coordination.ReturnDepartsAtUtc),
            new ExecutiveLodgingSnapshot(
                coordination.HotelName,
                coordination.HotelAddress,
                coordination.HotelCheckInAtUtc,
                coordination.HotelCheckOutAtUtc),
            new ExecutiveTransportationSnapshot(
                coordination.TransportationPlan,
                coordination.PickupContactName,
                coordination.PickupContactPhone),
            coordination.Schedule,
            executiveContacts,
            coordination.PrayerFocus,
            workspace.Readiness,
            executiveActivity);
    }

    public async Task<TravelLaneDetails?> GetTravelAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "travel", ct);
        return new TravelLaneDetails(
            assignmentId, lane,
            preparation.OutboundAirline,
            preparation.OutboundFlightNumber,
            preparation.OutboundConfirmationNumber,
            preparation.OutboundDepartureAirport,
            preparation.OutboundArrivalAirport,
            preparation.OutboundDepartsAtUtc,
            preparation.OutboundArrivesAtUtc,
            preparation.ReturnAirline,
            preparation.ReturnFlightNumber,
            preparation.ReturnConfirmationNumber,
            preparation.ReturnDepartureAirport,
            preparation.ReturnArrivalAirport,
            preparation.ReturnDepartsAtUtc,
            preparation.ReturnArrivesAtUtc,
            ContactsForLane(preparation, "travel"),
            await DocumentsForLaneAsync(tenantId, assignmentId, "travel", ct));
    }

    public async Task<TravelLaneDetails?> UpdateTravelAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateTravelLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.OutboundAirline = Trim(request.OutboundAirline);
        preparation.OutboundFlightNumber = Trim(request.OutboundFlightNumber);
        preparation.OutboundConfirmationNumber = Trim(request.OutboundConfirmationNumber);
        preparation.OutboundDepartureAirport = Trim(request.OutboundDepartureAirport);
        preparation.OutboundArrivalAirport = Trim(request.OutboundArrivalAirport);
        preparation.OutboundDepartsAtUtc = request.OutboundDepartsAtUtc;
        preparation.OutboundArrivesAtUtc = request.OutboundArrivesAtUtc;
        preparation.ReturnAirline = Trim(request.ReturnAirline);
        preparation.ReturnFlightNumber = Trim(request.ReturnFlightNumber);
        preparation.ReturnConfirmationNumber = Trim(request.ReturnConfirmationNumber);
        preparation.ReturnDepartureAirport = Trim(request.ReturnDepartureAirport);
        preparation.ReturnArrivalAirport = Trim(request.ReturnArrivalAirport);
        preparation.ReturnDepartsAtUtc = request.ReturnDepartsAtUtc;
        preparation.ReturnArrivesAtUtc = request.ReturnArrivesAtUtc;
        ReplaceLaneContacts(preparation, "travel", request.Contacts);
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await SyncAssignmentAsync(preparation, ct);
        await AddActivityAsync(tenantId, assignmentId, "travel-updated", "Travel updated", "Flight itinerary details were updated.", actor, ct);
        return await GetTravelAsync(tenantId, assignmentId, ct);
    }

    public async Task<LodgingLaneDetails?> GetLodgingAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "lodging", ct);
        return new LodgingLaneDetails(
            assignmentId, lane,
            preparation.HotelName,
            preparation.HotelAddress,
            preparation.HotelConfirmationNumber,
            preparation.HotelCheckInAtUtc,
            preparation.HotelCheckOutAtUtc,
            ContactsForLane(preparation, "lodging"),
            await DocumentsForLaneAsync(tenantId, assignmentId, "lodging", ct));
    }

    public async Task<LodgingLaneDetails?> UpdateLodgingAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateLodgingLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.HotelName = Trim(request.HotelName);
        preparation.HotelAddress = Trim(request.HotelAddress);
        preparation.HotelConfirmationNumber = Trim(request.HotelConfirmationNumber);
        preparation.HotelCheckInAtUtc = request.HotelCheckInAtUtc;
        preparation.HotelCheckOutAtUtc = request.HotelCheckOutAtUtc;
        ReplaceLaneContacts(preparation, "lodging", request.Contacts);
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await SyncAssignmentAsync(preparation, ct);
        await AddActivityAsync(tenantId, assignmentId, "lodging-updated", "Lodging updated", "Hotel and stay details were updated.", actor, ct);
        return await GetLodgingAsync(tenantId, assignmentId, ct);
    }

    public async Task<TransportationLaneDetails?> GetTransportationAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "transportation", ct);
        return new TransportationLaneDetails(
            assignmentId, lane,
            preparation.TransportationPlan,
            preparation.PickupContactName,
            preparation.PickupContactPhone,
            ContactsForLane(preparation, "transportation"),
            await DocumentsForLaneAsync(tenantId, assignmentId, "transportation", ct));
    }

    public async Task<TransportationLaneDetails?> UpdateTransportationAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateTransportationLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.TransportationPlan = Trim(request.TransportationPlan);
        preparation.PickupContactName = Trim(request.PickupContactName);
        preparation.PickupContactPhone = Trim(request.PickupContactPhone);
        ReplaceLaneContacts(preparation, "transportation", request.Contacts);
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await SyncAssignmentAsync(preparation, ct);
        await AddActivityAsync(tenantId, assignmentId, "transportation-updated", "Transportation updated", "Ground transportation details were updated.", actor, ct);
        return await GetTransportationAsync(tenantId, assignmentId, ct);
    }

    public async Task<ProgramLaneDetails?> GetProgramAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "program", ct);
        return new ProgramLaneDetails(
            assignmentId,
            lane,
            DeserializeSchedule(preparation.ScheduleJson),
            ContactsForLane(preparation, "program"),
            await DocumentsForLaneAsync(tenantId, assignmentId, "program", ct));
    }

    public async Task<ProgramLaneDetails?> UpdateProgramAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateProgramLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.ScheduleJson = JsonSerializer.Serialize(request.Schedule ?? [], JsonOptions);
        ReplaceLaneContacts(preparation, "program", request.Contacts);
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "program-updated", "Program updated", "The engagement schedule and program details were updated.", actor, ct);
        return await GetProgramAsync(tenantId, assignmentId, ct);
    }

    public async Task<MediaLaneDetails?> GetMediaAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "media", ct);

        var assetRecords = await engagementsDatabase.MediaAssets.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .OrderBy(x => x.Purpose)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);
        var assets = assetRecords.Select(MapMediaAsset).ToArray();

        var documentRecords = await engagementsDatabase.Documents.AsNoTracking()
            .Where(x => x.AssignmentId == assignmentId && x.Assignment != null && x.Assignment.TenantId == tenantId)
            .Where(x => x.Category == "media")
            .OrderBy(x => x.Name)
            .ToListAsync(ct);
        var documents = documentRecords.Select(MapDocument).ToArray();

        return new MediaLaneDetails(
            assignmentId,
            lane,
            preparation.PromotionRequirements,
            ContactsForLane(preparation, "media"),
            assets,
            documents);
    }

    public async Task<MediaLaneDetails?> UpdateMediaAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateMediaLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.PromotionRequirements = Trim(request.PromotionRequirements);
        ReplaceLaneContacts(preparation, "media", request.Contacts);
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "media-updated", "Media preparation updated", "Media requirements and contacts were updated.", actor, ct);
        return await GetMediaAsync(tenantId, assignmentId, ct);
    }

    public async Task<MediaAssetDto?> CreateMediaAssetAsync(
        Guid tenantId,
        Guid assignmentId,
        CreateMediaAssetRequest request,
        string actorSubject,
        string actorName,
        CancellationToken ct)
    {
        if (!await AssignmentExistsAsync(tenantId, assignmentId, ct)) return null;

        var now = DateTimeOffset.UtcNow;
        var item = new EngagementMediaAsset
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            Name = Required(request.Name, nameof(request.Name)),
            AssetType = Validate(request.AssetType, MediaAssetTypes, "asset type"),
            Purpose = Required(request.Purpose, nameof(request.Purpose)),
            Status = Validate(request.Status, MediaAssetStatuses, "media asset status"),
            Source = Validate(request.Source, MediaAssetSources, "media asset source"),
            StorageReference = Trim(request.StorageReference),
            ExternalUrl = ValidateOptionalUrl(request.ExternalUrl),
            Notes = Trim(request.Notes),
            UpdatedBySubject = actorSubject,
            UpdatedByName = actorName,
            UpdatedAtUtc = now,
            CreatedAtUtc = now
        };

        engagementsDatabase.MediaAssets.Add(item);
        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "media-asset-added", "Media asset added", item.Name, actorName, ct);
        return MapMediaAsset(item);
    }

    public async Task<MediaAssetDto?> UpdateMediaAssetAsync(
        Guid tenantId,
        Guid assignmentId,
        Guid assetId,
        UpdateMediaAssetRequest request,
        string actorSubject,
        string actorName,
        CancellationToken ct)
    {
        var item = await engagementsDatabase.MediaAssets.SingleOrDefaultAsync(
            x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.Id == assetId,
            ct);
        if (item is null) return null;

        item.Name = Required(request.Name, nameof(request.Name));
        item.AssetType = Validate(request.AssetType, MediaAssetTypes, "asset type");
        item.Purpose = Required(request.Purpose, nameof(request.Purpose));
        item.Status = Validate(request.Status, MediaAssetStatuses, "media asset status");
        item.Source = Validate(request.Source, MediaAssetSources, "media asset source");
        item.StorageReference = Trim(request.StorageReference);
        item.ExternalUrl = ValidateOptionalUrl(request.ExternalUrl);
        item.Notes = Trim(request.Notes);
        item.UpdatedBySubject = actorSubject;
        item.UpdatedByName = actorName;
        item.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "media-asset-updated", "Media asset updated", item.Name, actorName, ct);
        return MapMediaAsset(item);
    }

    public async Task<bool> DeleteMediaAssetAsync(
        Guid tenantId,
        Guid assignmentId,
        Guid assetId,
        string actor,
        CancellationToken ct)
    {
        var item = await engagementsDatabase.MediaAssets.SingleOrDefaultAsync(
            x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.Id == assetId,
            ct);
        if (item is null) return false;

        var name = item.Name;
        engagementsDatabase.MediaAssets.Remove(item);
        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "media-asset-removed", "Media asset removed", name, actor, ct);
        return true;
    }

    public async Task<DocumentsLaneDetails?> GetDocumentsAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        if (!await AssignmentExistsAsync(tenantId, assignmentId, ct)) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "documents", ct);
        var documentRecords = await engagementsDatabase.Documents.AsNoTracking()
            .Where(x => x.AssignmentId == assignmentId && x.Assignment != null && x.Assignment.TenantId == tenantId)
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);
        return new DocumentsLaneDetails(assignmentId, lane, documentRecords.Select(MapDocument).ToArray());
    }

    public async Task<LaneDocumentDto?> CreateLaneDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        CreateLaneDocumentRequest request,
        CancellationToken ct)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        if (!await AssignmentExistsAsync(tenantId, assignmentId, ct)) return null;

        var now = DateTimeOffset.UtcNow;
        var document = new EngagementDocument
        {
            Id = Guid.NewGuid(),
            AssignmentId = assignmentId,
            Name = Required(request.Name, nameof(request.Name)),
            Category = lane.Key,
            Status = Validate(request.Status, DocumentStatuses, "document status"),
            StorageReference = Trim(request.StorageReference),
            UpdatedAtUtc = now
        };
        engagementsDatabase.Documents.Add(document);
        await engagementsDatabase.SaveChangesAsync(ct);
        return MapDocument(document);
    }

    public async Task<LaneDocumentDto?> UpdateLaneDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        Guid documentId,
        UpdateLaneDocumentRequest request,
        CancellationToken ct)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var document = await engagementsDatabase.Documents.SingleOrDefaultAsync(
            x => x.AssignmentId == assignmentId &&
                 x.Id == documentId &&
                 x.Assignment != null &&
                 x.Assignment.TenantId == tenantId,
            ct);
        if (document is null) return null;
        if (!string.Equals(document.Category, lane.Key, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(lane.Key, "documents", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("That document belongs to a different responsibility lane.");

        document.Status = Validate(request.Status, DocumentStatuses, "document status");
        document.StorageReference = Trim(request.StorageReference);
        document.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await engagementsDatabase.SaveChangesAsync(ct);
        return MapDocument(document);
    }

    public async Task<bool> DeleteLaneDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        Guid documentId,
        CancellationToken ct)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var document = await engagementsDatabase.Documents.SingleOrDefaultAsync(
            x => x.AssignmentId == assignmentId &&
                 x.Id == documentId &&
                 x.Assignment != null &&
                 x.Assignment.TenantId == tenantId,
            ct);
        if (document is null) return false;
        if (!string.Equals(document.Category, lane.Key, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(lane.Key, "documents", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("That document belongs to a different responsibility lane.");

        engagementsDatabase.Documents.Remove(document);
        await engagementsDatabase.SaveChangesAsync(ct);
        return true;
    }

    public async Task<FinanceLaneDetails?> GetFinanceAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "finance", ct);
        return new FinanceLaneDetails(
            assignmentId,
            lane,
            preparation.TravelCoverageStatus,
            preparation.LodgingCoverageStatus,
            preparation.TravelBookedBy,
            preparation.HonorariumStatus,
            preparation.HonorariumAmount,
            preparation.HonorariumCurrency,
            preparation.PaymentStatus);
    }

    public async Task<FinanceLaneDetails?> UpdateFinanceAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateFinanceLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.TravelCoverageStatus = Required(request.TravelCoverageStatus, nameof(request.TravelCoverageStatus)).ToLowerInvariant();
        preparation.LodgingCoverageStatus = Required(request.LodgingCoverageStatus, nameof(request.LodgingCoverageStatus)).ToLowerInvariant();
        preparation.TravelBookedBy = Required(request.TravelBookedBy, nameof(request.TravelBookedBy)).ToLowerInvariant();
        preparation.HonorariumStatus = Required(request.HonorariumStatus, nameof(request.HonorariumStatus)).ToLowerInvariant();
        preparation.HonorariumAmount = request.HonorariumAmount;
        preparation.HonorariumCurrency = Required(request.HonorariumCurrency, nameof(request.HonorariumCurrency)).ToUpperInvariant();
        preparation.PaymentStatus = Required(request.PaymentStatus, nameof(request.PaymentStatus)).ToLowerInvariant();
        Touch(preparation);

        await preparationDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "finance-updated", "Finance and honorarium updated", "Engagement financial preparation was updated.", actor, ct);
        return await GetFinanceAsync(tenantId, assignmentId, ct);
    }

    public async Task<MinistryPreparationLaneDetails?> GetMinistryPreparationAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "ministry-preparation", ct);
        return new MinistryPreparationLaneDetails(
            assignmentId,
            lane,
            preparation.PrayerFocus,
            preparation.MinistryPreparationNotes);
    }

    public async Task<MinistryPreparationLaneDetails?> UpdateMinistryPreparationAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateMinistryPreparationLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.PrayerFocus = Trim(request.PrayerFocus);
        preparation.MinistryPreparationNotes = Trim(request.MinistryPreparationNotes);
        Touch(preparation);
        await preparationDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "ministry-preparation-updated", "Ministry preparation updated", "Prayer focus and ministry preparation notes were updated.", actor, ct);
        return await GetMinistryPreparationAsync(tenantId, assignmentId, ct);
    }

    public async Task<HospitalityLaneDetails?> GetHospitalityAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "hospitality", ct);
        return new HospitalityLaneDetails(
            assignmentId,
            lane,
            preparation.HospitalityNotes,
            ContactsForLane(preparation, "hospitality"),
            await DocumentsForLaneAsync(tenantId, assignmentId, "hospitality", ct));
    }

    public async Task<HospitalityLaneDetails?> UpdateHospitalityAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateHospitalityLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.HospitalityNotes = Trim(request.HospitalityNotes);
        ReplaceLaneContacts(preparation, "hospitality", request.Contacts);
        Touch(preparation);
        await preparationDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId, assignmentId, "hospitality-updated", "Hospitality updated", "Hospitality preparation and contacts were updated.", actor, ct);
        return await GetHospitalityAsync(tenantId, assignmentId, ct);
    }

    public async Task<HostCoordinationLaneDetails?> GetHostCoordinationAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var preparation = await GetPreparationAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;
        var lane = await RequiredLaneAsync(tenantId, assignmentId, "host-coordination", ct);
        return new HostCoordinationLaneDetails(
            assignmentId,
            lane,
            preparation.CoordinationStatus,
            preparation.SubmittedAtUtc,
            preparation.HostNotes,
            ContactsForLane(preparation, "host-coordination", includeAll: true),
            await DocumentsForLaneAsync(tenantId, assignmentId, "host-coordination", ct));
    }

    public async Task<HostCoordinationLaneDetails?> UpdateHostCoordinationAsync(
        Guid tenantId,
        Guid assignmentId,
        UpdateHostCoordinationLaneRequest request,
        string actor,
        CancellationToken ct)
    {
        var preparation = await GetPreparationForUpdateAsync(tenantId, assignmentId, ct);
        if (preparation is null) return null;

        preparation.HostNotes = Trim(request.HostNotes);
        ReplaceLaneContacts(preparation, "host-coordination", request.Contacts, replaceAll: false);
        Touch(preparation);
        await preparationDatabase.SaveChangesAsync(ct);
        await SyncAssignmentAsync(preparation, ct);
        await AddActivityAsync(tenantId, assignmentId, "host-coordination-updated", "Host coordination updated", "Host contacts and coordination notes were updated.", actor, ct);
        return await GetHostCoordinationAsync(tenantId, assignmentId, ct);
    }

    private async Task<IReadOnlyList<LaneDocumentDto>> DocumentsForLaneAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        CancellationToken ct)
    {
        var records = await engagementsDatabase.Documents.AsNoTracking()
            .Where(document =>
                document.AssignmentId == assignmentId &&
                document.Assignment != null &&
                document.Assignment.TenantId == tenantId &&
                document.Category == laneKey)
            .OrderBy(document => document.Name)
            .ToListAsync(ct);

        return records.Select(MapDocument).ToArray();
    }

    private async Task<EngagementPreparationRecord?> GetPreparationAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        await preparationService.EnsureAsync(tenantId, assignmentId, ct);
        return await preparationDatabase.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, ct);
    }

    private async Task<EngagementPreparationRecord?> GetPreparationForUpdateAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        await preparationService.EnsureAsync(tenantId, assignmentId, ct);
        return await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, ct);
    }

    private async Task<ResponsibilityLaneState> RequiredLaneAsync(Guid tenantId, Guid assignmentId, string laneKey, CancellationToken ct) =>
        await responsibilities.GetLaneAsync(tenantId, assignmentId, laneKey, ct)
        ?? throw new InvalidOperationException("The assignment responsibility lane could not be loaded.");

    private async Task<bool> AssignmentExistsAsync(Guid tenantId, Guid assignmentId, CancellationToken ct) =>
        await engagementsDatabase.Assignments.AsNoTracking()
            .AnyAsync(x => x.TenantId == tenantId && x.Id == assignmentId, ct);

    private async Task SyncAssignmentAsync(EngagementPreparationRecord preparation, CancellationToken ct)
    {
        var assignment = await engagementsDatabase.Assignments.SingleOrDefaultAsync(
            x => x.TenantId == preparation.TenantId && x.Id == preparation.AssignmentId,
            ct);
        if (assignment is null) return;

        assignment.TravelStatus = TravelComplete(preparation) ? "confirmed" : TravelStarted(preparation) ? "in-progress" : "not-started";
        assignment.LodgingStatus = LodgingComplete(preparation) ? "confirmed" : LodgingStarted(preparation) ? "in-progress" : "not-started";
        assignment.TransportationStatus = TransportationComplete(preparation) ? "confirmed" : TransportationStarted(preparation) ? "in-progress" : "not-started";

        var primary = DeserializeContacts(preparation.ContactsJson)
            .FirstOrDefault(contact =>
                string.Equals(contact.Type, "primary", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(contact.Type, "host", StringComparison.OrdinalIgnoreCase));
        if (primary is not null)
        {
            assignment.HostContactName = Trim(primary.Name) ?? assignment.HostContactName;
            assignment.HostContactEmail = Trim(primary.Email)?.ToLowerInvariant() ?? assignment.HostContactEmail;
        }

        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await engagementsDatabase.SaveChangesAsync(ct);
    }

    private IReadOnlyList<LaneContactView> ContactsForLane(
        EngagementPreparationRecord preparation,
        string laneKey,
        bool includeAll = false)
    {
        var contacts = DeserializeContacts(preparation.ContactsJson);
        if (includeAll)
        {
            return contacts.Select(contact => new LaneContactView(
                contact.Type,
                contact.Name,
                contact.Email,
                contact.Phone,
                IsEditableContactType(laneKey, contact.Type))).ToArray();
        }

        return contacts
            .Where(contact =>
                SharedContactTypes.Contains(Normalize(contact.Type)) ||
                IsEditableContactType(laneKey, contact.Type))
            .Select(contact => new LaneContactView(
                contact.Type,
                contact.Name,
                contact.Email,
                contact.Phone,
                IsEditableContactType(laneKey, contact.Type)))
            .ToArray();
    }

    private void ReplaceLaneContacts(
        EngagementPreparationRecord preparation,
        string laneKey,
        IReadOnlyList<HostContactInput>? incoming,
        bool replaceAll = false)
    {
        if (incoming is null) return;

        foreach (var contact in incoming)
        {
            if (!IsEditableContactType(laneKey, contact.Type))
                throw new ArgumentException($"Contact type '{contact.Type}' cannot be edited from the {laneKey} lane.");
            if (string.IsNullOrWhiteSpace(contact.Name))
                throw new ArgumentException("Every contact must have a name.");
        }

        var existing = DeserializeContacts(preparation.ContactsJson).ToList();
        if (replaceAll)
        {
            existing.Clear();
        }
        else
        {
            existing.RemoveAll(contact => IsEditableContactType(laneKey, contact.Type));
        }

        existing.AddRange(incoming.Select(contact => contact with
        {
            Type = Normalize(contact.Type),
            Name = contact.Name.Trim(),
            Email = Trim(contact.Email)?.ToLowerInvariant(),
            Phone = Trim(contact.Phone)
        }));

        preparation.ContactsJson = JsonSerializer.Serialize(existing, JsonOptions);
    }

    private static bool IsEditableContactType(string laneKey, string contactType) =>
        EditableContactTypes.TryGetValue(laneKey, out var allowed) &&
        allowed.Contains(Normalize(contactType));

    private async Task AddActivityAsync(
        Guid tenantId,
        Guid assignmentId,
        string kind,
        string title,
        string detail,
        string actor,
        CancellationToken ct)
    {
        await activityDatabase.EnsureSchemaAsync(ct);
        activityDatabase.Activities.Add(new AssignmentWorkspaceActivityRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            Kind = kind,
            Title = title,
            Detail = detail,
            Actor = actor,
            OccurredAtUtc = DateTimeOffset.UtcNow
        });
        await activityDatabase.SaveChangesAsync(ct);
    }

    private static MediaAssetDto MapMediaAsset(EngagementMediaAsset item) => new(
        item.Id,
        item.AssignmentId,
        item.Name,
        item.AssetType,
        item.Purpose,
        item.Status,
        item.Source,
        item.StorageReference,
        item.ExternalUrl,
        item.Notes,
        item.UpdatedByName,
        item.UpdatedAtUtc,
        item.CreatedAtUtc);

    private static LaneDocumentDto MapDocument(EngagementDocument item) => new(
        item.Id,
        item.Name,
        item.Category,
        item.Status,
        item.StorageReference,
        item.UpdatedAtUtc);

    private static IReadOnlyList<HostScheduleItemInput> DeserializeSchedule(string json) =>
        JsonSerializer.Deserialize<HostScheduleItemInput[]>(json, JsonOptions) ?? [];

    private static IReadOnlyList<HostContactInput> DeserializeContacts(string json) =>
        JsonSerializer.Deserialize<HostContactInput[]>(json, JsonOptions) ?? [];

    private static bool TravelStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) ||
        !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) ||
        p.OutboundDepartsAtUtc is not null ||
        !string.IsNullOrWhiteSpace(p.ReturnAirline) ||
        !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) ||
        p.ReturnDepartsAtUtc is not null;

    private static bool TravelComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.OutboundAirline) &&
        !string.IsNullOrWhiteSpace(p.OutboundFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.OutboundDepartureAirport) &&
        !string.IsNullOrWhiteSpace(p.OutboundArrivalAirport) &&
        p.OutboundDepartsAtUtc is not null &&
        p.OutboundArrivesAtUtc is not null &&
        !string.IsNullOrWhiteSpace(p.ReturnAirline) &&
        !string.IsNullOrWhiteSpace(p.ReturnFlightNumber) &&
        !string.IsNullOrWhiteSpace(p.ReturnDepartureAirport) &&
        !string.IsNullOrWhiteSpace(p.ReturnArrivalAirport) &&
        p.ReturnDepartsAtUtc is not null &&
        p.ReturnArrivesAtUtc is not null;

    private static bool LodgingStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) ||
        !string.IsNullOrWhiteSpace(p.HotelAddress) ||
        p.HotelCheckInAtUtc is not null;

    private static bool LodgingComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.HotelName) &&
        !string.IsNullOrWhiteSpace(p.HotelAddress) &&
        p.HotelCheckInAtUtc is not null &&
        p.HotelCheckOutAtUtc is not null;

    private static bool TransportationStarted(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) ||
        !string.IsNullOrWhiteSpace(p.PickupContactName);

    private static bool TransportationComplete(EngagementPreparationRecord p) =>
        !string.IsNullOrWhiteSpace(p.TransportationPlan) &&
        !string.IsNullOrWhiteSpace(p.PickupContactName) &&
        !string.IsNullOrWhiteSpace(p.PickupContactPhone);

    private static void Touch(EngagementPreparationRecord preparation)
    {
        preparation.UpdatedAtUtc = DateTimeOffset.UtcNow;
        if (preparation.TermsStatus == "accepted" &&
            !string.Equals(preparation.CoordinationStatus, "submitted", StringComparison.OrdinalIgnoreCase))
            preparation.CoordinationStatus = "in-progress";
    }

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException($"{field} is required.")
            : value.Trim();

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Normalize(string? value) =>
        (value ?? string.Empty).Trim().ToLowerInvariant().Replace('_', '-');

    private static string Validate(string value, IReadOnlySet<string> supported, string label)
    {
        var normalized = Normalize(value);
        return supported.Contains(normalized)
            ? normalized
            : throw new ArgumentException($"The {label} '{value}' is not supported.");
    }

    private static string? ValidateOptionalUrl(string? value)
    {
        var cleaned = Trim(value);
        if (cleaned is null) return null;
        if (!Uri.TryCreate(cleaned, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("External media URLs must use http or https.");
        return uri.ToString();
    }

    private static HashSet<string> Set(params string[] values) =>
        values.ToHashSet(StringComparer.OrdinalIgnoreCase);
}

public static class EngagementLaneWorkspaceEndpoints
{
    public static IEndpointRouteBuilder MapEngagementLaneWorkspaceEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements/assignments").RequireAuthorization();

        group.MapGet("/{id:guid}/executive-brief", async (
            Guid id,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            CancellationToken ct) =>
        {
            if (!KingdomIdentity.CanViewAllEngagements(context.User))
                return Results.Forbid();

            var item = await lanes.GetExecutiveBriefAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        MapLane<TravelLaneDetails, UpdateTravelLaneRequest>(
            group,
            "travel",
            (service, tenantId, id, ct) => service.GetTravelAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateTravelAsync(tenantId, id, request, actor, ct));

        MapLane<LodgingLaneDetails, UpdateLodgingLaneRequest>(
            group,
            "lodging",
            (service, tenantId, id, ct) => service.GetLodgingAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateLodgingAsync(tenantId, id, request, actor, ct));

        MapLane<TransportationLaneDetails, UpdateTransportationLaneRequest>(
            group,
            "transportation",
            (service, tenantId, id, ct) => service.GetTransportationAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateTransportationAsync(tenantId, id, request, actor, ct));

        MapLane<ProgramLaneDetails, UpdateProgramLaneRequest>(
            group,
            "program",
            (service, tenantId, id, ct) => service.GetProgramAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateProgramAsync(tenantId, id, request, actor, ct));

        MapLane<MediaLaneDetails, UpdateMediaLaneRequest>(
            group,
            "media",
            (service, tenantId, id, ct) => service.GetMediaAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateMediaAsync(tenantId, id, request, actor, ct));

        MapLane<FinanceLaneDetails, UpdateFinanceLaneRequest>(
            group,
            "finance",
            (service, tenantId, id, ct) => service.GetFinanceAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateFinanceAsync(tenantId, id, request, actor, ct));

        MapLane<MinistryPreparationLaneDetails, UpdateMinistryPreparationLaneRequest>(
            group,
            "ministry-preparation",
            (service, tenantId, id, ct) => service.GetMinistryPreparationAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateMinistryPreparationAsync(tenantId, id, request, actor, ct));

        MapLane<HospitalityLaneDetails, UpdateHospitalityLaneRequest>(
            group,
            "hospitality",
            (service, tenantId, id, ct) => service.GetHospitalityAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateHospitalityAsync(tenantId, id, request, actor, ct));

        MapLane<HostCoordinationLaneDetails, UpdateHostCoordinationLaneRequest>(
            group,
            "host-coordination",
            (service, tenantId, id, ct) => service.GetHostCoordinationAsync(tenantId, id, ct),
            (service, tenantId, id, request, actor, ct) => service.UpdateHostCoordinationAsync(tenantId, id, request, actor, ct));

        group.MapGet("/{id:guid}/lanes/documents", async (
            Guid id,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, "documents", ct))
                return Results.Forbid();

            var item = await lanes.GetDocumentsAsync(
                KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        group.MapPost("/{id:guid}/lanes/{laneKey}/documents", async (
            Guid id,
            string laneKey,
            CreateLaneDocumentRequest request,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, laneKey, ct))
                return Results.Forbid();

            try
            {
                var item = await lanes.CreateLaneDocumentAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    request,
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
        });

        group.MapPut("/{id:guid}/lanes/{laneKey}/documents/{documentId:guid}", async (
            Guid id,
            string laneKey,
            Guid documentId,
            UpdateLaneDocumentRequest request,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, laneKey, ct))
                return Results.Forbid();

            try
            {
                var item = await lanes.UpdateLaneDocumentAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    documentId,
                    request,
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        group.MapDelete("/{id:guid}/lanes/{laneKey}/documents/{documentId:guid}", async (
            Guid id,
            string laneKey,
            Guid documentId,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, laneKey, ct))
                return Results.Forbid();

            try
            {
                var deleted = await lanes.DeleteLaneDocumentAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    documentId,
                    ct);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        group.MapPost("/{id:guid}/lanes/media/assets", async (
            Guid id,
            CreateMediaAssetRequest request,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, "media", ct))
                return Results.Forbid();

            try
            {
                var item = await lanes.CreateMediaAssetAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Media team",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = [exception.Message] });
            }
        });

        group.MapPut("/{id:guid}/lanes/media/assets/{assetId:guid}", async (
            Guid id,
            Guid assetId,
            UpdateMediaAssetRequest request,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, "media", ct))
                return Results.Forbid();

            try
            {
                var item = await lanes.UpdateMediaAssetAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    assetId,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Media team",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["media"] = [exception.Message] });
            }
        });

        group.MapDelete("/{id:guid}/lanes/media/assets/{assetId:guid}", async (
            Guid id,
            Guid assetId,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, "media", ct))
                return Results.Forbid();

            var deleted = await lanes.DeleteMediaAssetAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                assetId,
                context.User.Identity?.Name ?? "Media team",
                ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return endpoints;
    }

    private static void MapLane<TDetails, TRequest>(
        RouteGroupBuilder group,
        string laneKey,
        Func<EngagementLaneWorkspaceService, Guid, Guid, CancellationToken, Task<TDetails?>> get,
        Func<EngagementLaneWorkspaceService, Guid, Guid, TRequest, string, CancellationToken, Task<TDetails?>> update)
        where TDetails : class
    {
        group.MapGet($"/{{id:guid}}/lanes/{laneKey}", async (
            Guid id,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, laneKey, ct))
                return Results.Forbid();

            var item = await get(
                lanes,
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        group.MapPut($"/{{id:guid}}/lanes/{laneKey}", async (
            Guid id,
            TRequest request,
            HttpContext context,
            EngagementLaneWorkspaceService lanes,
            EngagementResponsibilityService responsibilities,
            CancellationToken ct) =>
        {
            if (!await CanAccessLaneAsync(context, responsibilities, id, laneKey, ct))
                return Results.Forbid();

            try
            {
                var item = await update(
                    lanes,
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    request,
                    context.User.Identity?.Name ?? "Engagement team member",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { [laneKey] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });
    }

    private static async Task<bool> CanAccessLaneAsync(
        HttpContext context,
        EngagementResponsibilityService responsibilities,
        Guid assignmentId,
        string laneKey,
        CancellationToken ct)
    {
        if (KingdomIdentity.CanDirectEngagements(context.User)) return true;

        try
        {
            return await responsibilities.IsEffectiveOwnerAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                assignmentId,
                laneKey,
                KingdomIdentity.Subject(context.User, context.Request),
                ct);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
