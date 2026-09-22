using System.Security.Claims;
using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed record TravelLaneDetails(
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
    IReadOnlyList<HostContactInput> Contacts,
    IReadOnlyList<EngagementDocument> Documents);

public sealed record TravelLaneUpdate(
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
    DateTimeOffset? ReturnArrivesAtUtc);

public sealed record LodgingLaneDetails(
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc,
    IReadOnlyList<HostContactInput> Contacts,
    IReadOnlyList<EngagementDocument> Documents);

public sealed record LodgingLaneUpdate(
    string? HotelName,
    string? HotelAddress,
    string? HotelConfirmationNumber,
    DateTimeOffset? HotelCheckInAtUtc,
    DateTimeOffset? HotelCheckOutAtUtc);

public sealed record TransportationLaneDetails(
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone,
    IReadOnlyList<HostContactInput> Contacts,
    IReadOnlyList<EngagementDocument> Documents);

public sealed record TransportationLaneUpdate(
    string? TransportationPlan,
    string? PickupContactName,
    string? PickupContactPhone);

public sealed record ProgramLaneDetails(
    IReadOnlyList<HostScheduleItemInput> Schedule,
    IReadOnlyList<HostContactInput> Contacts,
    string? PrayerFocus);

public sealed record ProgramLaneUpdate(
    IReadOnlyList<HostScheduleItemInput>? Schedule,
    string? PrayerFocus);

public sealed record MediaLaneDetails(
    string? PromotionRequirements,
    IReadOnlyList<HostContactInput> Contacts,
    IReadOnlyList<EngagementMediaAsset> Assets,
    IReadOnlyList<EngagementDocument> Documents);

public sealed record MediaLaneUpdate(string? PromotionRequirements);

public sealed record CreateMediaAssetRequest(
    string Name,
    string AssetType,
    string? StorageReference,
    string? Notes,
    string Status);

public sealed record UpdateMediaAssetRequest(
    string Name,
    string AssetType,
    string? StorageReference,
    string? Notes,
    string Status);

public sealed class EngagementMediaAsset
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = "image";
    public string Status { get; set; } = "requested";
    public string? StorageReference { get; set; }
    public string? Notes { get; set; }
    public string UpdatedBySubject { get; set; } = string.Empty;
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed class EngagementLaneOperationsService(
    EngagementPreparationDbContext preparationDatabase,
    EngagementsDbContext engagementsDatabase,
    AssignmentWorkspaceDbContext activityDatabase,
    EngagementPreparationService preparationService,
    EngagementResponsibilityService responsibilities)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int MaxLaneDocumentBytes = 10 * 1024 * 1024;
    private static readonly HashSet<string> MediaTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image", "video", "audio", "document", "link", "graphic", "logo"
    };
    private static readonly HashSet<string> AssetStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "requested", "received", "in-progress", "ready-for-review", "approved", "complete", "not-applicable"
    };

    public async Task<bool> CanUseLaneAsync(
        ClaimsPrincipal user,
        HttpRequest request,
        Guid assignmentId,
        string laneKey,
        CancellationToken cancellationToken)
    {
        if (KingdomIdentity.CanDirectEngagements(user)) return true;

        return await responsibilities.IsEffectiveOwnerAsync(
            KingdomIdentity.TenantId(user, request),
            assignmentId,
            laneKey,
            KingdomIdentity.Subject(user, request),
            cancellationToken);
    }

    public async Task<TravelLaneDetails?> GetTravelAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var context = await LoadAsync(tenantId, assignmentId, ct);
        if (context is null) return null;
        var (preparation, assignment) = context.Value;
        return new TravelLaneDetails(
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
            Contacts(preparation, "primary", "host", "travel", "transportation"),
            Documents(assignment, "travel"));
    }

    public async Task<TravelLaneDetails?> UpdateTravelAsync(
        Guid tenantId, Guid assignmentId, TravelLaneUpdate input,
        string actorSubject, string actorName, CancellationToken ct)
    {
        var context = await LoadTrackedAsync(tenantId, assignmentId, ct);
        if (context is null) return null;
        var (preparation, assignment) = context.Value;

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

        var now=DateTimeOffset.UtcNow;
        preparation.UpdatedAtUtc=now;
        assignment.TravelStatus = TravelComplete(preparation) ? "confirmed" : TravelStarted(preparation) ? "in-progress" : "not-started";
        assignment.UpdatedAtUtc=now;
        await SaveAndAuditAsync(tenantId, assignmentId, "travel-updated", "Travel updated",
            "Flight itinerary details were updated.", actorSubject, actorName, now, ct);
        return await GetTravelAsync(tenantId, assignmentId, ct);
    }

    public async Task<LodgingLaneDetails?> GetLodgingAsync(Guid tenantId, Guid assignmentId, CancellationToken ct)
    {
        var context=await LoadAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        return new LodgingLaneDetails(
            p.HotelName,p.HotelAddress,p.HotelConfirmationNumber,p.HotelCheckInAtUtc,p.HotelCheckOutAtUtc,
            Contacts(p,"primary","host","lodging","hospitality"),
            Documents(a,"lodging","hospitality"));
    }

    public async Task<LodgingLaneDetails?> UpdateLodgingAsync(
        Guid tenantId, Guid assignmentId, LodgingLaneUpdate input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        var context=await LoadTrackedAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        p.HotelName=Trim(input.HotelName);
        p.HotelAddress=Trim(input.HotelAddress);
        p.HotelConfirmationNumber=Trim(input.HotelConfirmationNumber);
        p.HotelCheckInAtUtc=input.HotelCheckInAtUtc;
        p.HotelCheckOutAtUtc=input.HotelCheckOutAtUtc;
        var now=DateTimeOffset.UtcNow;
        p.UpdatedAtUtc=now;
        a.LodgingStatus=LodgingComplete(p)?"confirmed":LodgingStarted(p)?"in-progress":"not-started";
        a.UpdatedAtUtc=now;
        await SaveAndAuditAsync(tenantId,assignmentId,"lodging-updated","Lodging updated",
            "Hotel and stay details were updated.",actorSubject,actorName,now,ct);
        return await GetLodgingAsync(tenantId,assignmentId,ct);
    }

    public async Task<TransportationLaneDetails?> GetTransportationAsync(Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        var context=await LoadAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        return new TransportationLaneDetails(
            p.TransportationPlan,p.PickupContactName,p.PickupContactPhone,
            Contacts(p,"primary","host","transportation","driver"),
            Documents(a,"transportation"));
    }

    public async Task<TransportationLaneDetails?> UpdateTransportationAsync(
        Guid tenantId,Guid assignmentId,TransportationLaneUpdate input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        var context=await LoadTrackedAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        p.TransportationPlan=Trim(input.TransportationPlan);
        p.PickupContactName=Trim(input.PickupContactName);
        p.PickupContactPhone=Trim(input.PickupContactPhone);
        var now=DateTimeOffset.UtcNow;
        p.UpdatedAtUtc=now;
        a.TransportationStatus=TransportationComplete(p)?"confirmed":TransportationStarted(p)?"in-progress":"not-started";
        a.UpdatedAtUtc=now;
        await SaveAndAuditAsync(tenantId,assignmentId,"transportation-updated","Transportation updated",
            "Ground transportation and pickup details were updated.",actorSubject,actorName,now,ct);
        return await GetTransportationAsync(tenantId,assignmentId,ct);
    }

    public async Task<ProgramLaneDetails?> GetProgramAsync(Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        var context=await LoadAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,_)=context.Value;
        return new ProgramLaneDetails(
            DeserializeSchedule(p.ScheduleJson),
            Contacts(p,"primary","host","program","media","production"),
            p.PrayerFocus);
    }

    public async Task<ProgramLaneDetails?> UpdateProgramAsync(
        Guid tenantId,Guid assignmentId,ProgramLaneUpdate input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        var context=await LoadTrackedAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        var schedule=input.Schedule??[];
        ValidateSchedule(schedule);
        p.ScheduleJson=JsonSerializer.Serialize(schedule,JsonOptions);
        p.PrayerFocus=Trim(input.PrayerFocus);
        var now=DateTimeOffset.UtcNow;
        p.UpdatedAtUtc=now;
        a.UpdatedAtUtc=now;
        await SaveAndAuditAsync(tenantId,assignmentId,"program-updated","Program updated",
            "Engagement schedule and ministry preparation details were updated.",actorSubject,actorName,now,ct);
        return await GetProgramAsync(tenantId,assignmentId,ct);
    }

    public async Task<MediaLaneDetails?> GetMediaAsync(Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        var context=await LoadAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        var assets=await engagementsDatabase.MediaAssets.AsNoTracking()
            .Where(x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId)
            .OrderBy(x=>x.AssetType).ThenBy(x=>x.Name)
            .ToListAsync(ct);
        return new MediaLaneDetails(
            p.PromotionRequirements,
            Contacts(p,"primary","host","media","production"),
            assets,
            Documents(a,"media","production"));
    }

    public async Task<MediaLaneDetails?> UpdateMediaAsync(
        Guid tenantId,Guid assignmentId,MediaLaneUpdate input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        var context=await LoadTrackedAsync(tenantId,assignmentId,ct);
        if(context is null) return null;
        var (p,a)=context.Value;
        p.PromotionRequirements=Trim(input.PromotionRequirements);
        var now=DateTimeOffset.UtcNow;
        p.UpdatedAtUtc=now;
        a.UpdatedAtUtc=now;
        await SaveAndAuditAsync(tenantId,assignmentId,"media-updated","Media requirements updated",
            "Media and promotional requirements were updated.",actorSubject,actorName,now,ct);
        return await GetMediaAsync(tenantId,assignmentId,ct);
    }

    public async Task<EngagementMediaAsset?> AddMediaAssetAsync(
        Guid tenantId,Guid assignmentId,CreateMediaAssetRequest input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        if(!await engagementsDatabase.Assignments.AsNoTracking()
            .AnyAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct)) return null;
        var now=DateTimeOffset.UtcNow;
        var asset=new EngagementMediaAsset
        {
            Id=Guid.NewGuid(),TenantId=tenantId,AssignmentId=assignmentId,
            Name=Required(input.Name,"name"),
            AssetType=MediaType(input.AssetType),
            StorageReference=Trim(input.StorageReference),
            Notes=Trim(input.Notes),
            Status=AssetStatus(input.Status),
            UpdatedBySubject=actorSubject,
            UpdatedByName=actorName,
            UpdatedAtUtc=now
        };
        engagementsDatabase.MediaAssets.Add(asset);
        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId,assignmentId,"media-asset-added","Media asset added",
            asset.Name,actorName,now,ct);
        return asset;
    }

    public async Task<EngagementMediaAsset?> UpdateMediaAssetAsync(
        Guid tenantId,Guid assignmentId,Guid assetId,UpdateMediaAssetRequest input,
        string actorSubject,string actorName,CancellationToken ct)
    {
        var asset=await engagementsDatabase.MediaAssets.SingleOrDefaultAsync(
            x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId&&x.Id==assetId,ct);
        if(asset is null) return null;
        asset.Name=Required(input.Name,"name");
        asset.AssetType=MediaType(input.AssetType);
        asset.StorageReference=Trim(input.StorageReference);
        asset.Notes=Trim(input.Notes);
        asset.Status=AssetStatus(input.Status);
        asset.UpdatedBySubject=actorSubject;
        asset.UpdatedByName=actorName;
        asset.UpdatedAtUtc=DateTimeOffset.UtcNow;
        await engagementsDatabase.SaveChangesAsync(ct);
        return asset;
    }

    public async Task<bool> DeleteMediaAssetAsync(Guid tenantId,Guid assignmentId,Guid assetId,CancellationToken ct)
    {
        var asset=await engagementsDatabase.MediaAssets.SingleOrDefaultAsync(
            x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId&&x.Id==assetId,ct);
        if(asset is null) return false;
        engagementsDatabase.MediaAssets.Remove(asset);
        await engagementsDatabase.SaveChangesAsync(ct);
        return true;
    }

    public async Task<EngagementDocument?> AddLaneDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        string fileName,
        string contentType,
        byte[] content,
        string actorName,
        CancellationToken ct)
    {
        var lane=EngagementResponsibilityLanes.Get(laneKey);
        if(content.Length==0) throw new ArgumentException("Choose a file to upload.");
        if(content.Length>MaxLaneDocumentBytes) throw new ArgumentException("Lane documents must be 10 MB or smaller.");

        await preparationService.EnsureAsync(tenantId,assignmentId,ct);
        var preparation=await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId,ct);
        var assignment=await engagementsDatabase.Assignments
            .Include(x=>x.Documents)
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct);
        if(preparation is null||assignment is null) return null;

        var now=DateTimeOffset.UtcNow;
        var safeFileName=Path.GetFileName(Required(fileName,"fileName"));
        var source=new HostCoordinationDocumentRecord
        {
            Id=Guid.NewGuid(),
            PreparationId=preparation.Id,
            FileName=safeFileName,
            ContentType=string.IsNullOrWhiteSpace(contentType)?"application/octet-stream":contentType.Trim(),
            Length=content.LongLength,
            Content=content,
            UploadedAtUtc=now
        };
        preparationDatabase.Documents.Add(source);
        preparation.UpdatedAtUtc=now;

        var document=new EngagementDocument
        {
            Id=Guid.NewGuid(),
            AssignmentId=assignmentId,
            Name=safeFileName,
            Category=lane.Key,
            Status="received",
            StorageReference=$"coordination-document:{source.Id}",
            UpdatedAtUtc=now
        };
        assignment.Documents.Add(document);
        assignment.UpdatedAtUtc=now;
        if(lane.Key=="documents") assignment.DocumentsStatus="received";

        await preparationDatabase.SaveChangesAsync(ct);
        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId,assignmentId,"lane-document-added",
            $"{lane.Label} document added",safeFileName,actorName,now,ct);
        return document;
    }

    public async Task<HostCoordinationDocumentRecord?> GetLaneDocumentContentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        Guid documentId,
        CancellationToken ct)
    {
        var lane=EngagementResponsibilityLanes.Get(laneKey);
        var document=await engagementsDatabase.Documents.AsNoTracking()
            .SingleOrDefaultAsync(x=>x.AssignmentId==assignmentId&&x.Id==documentId&&x.Category==lane.Key,ct);
        if(document?.StorageReference is null||
           !document.StorageReference.StartsWith("coordination-document:",StringComparison.OrdinalIgnoreCase))
            return null;
        if(!Guid.TryParse(document.StorageReference["coordination-document:".Length..],out var sourceId))
            return null;

        return await preparationService.GetDocumentForAssignmentAsync(
            tenantId,assignmentId,sourceId,ct);
    }

    public async Task<bool> DeleteLaneDocumentAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        Guid documentId,
        string actorName,
        CancellationToken ct)
    {
        var lane=EngagementResponsibilityLanes.Get(laneKey);
        var document=await engagementsDatabase.Documents
            .SingleOrDefaultAsync(x=>x.AssignmentId==assignmentId&&x.Id==documentId&&x.Category==lane.Key,ct);
        if(document is null) return false;

        Guid? sourceId=null;
        if(document.StorageReference?.StartsWith("coordination-document:",StringComparison.OrdinalIgnoreCase)==true &&
           Guid.TryParse(document.StorageReference["coordination-document:".Length..],out var parsed))
            sourceId=parsed;

        engagementsDatabase.Documents.Remove(document);
        var assignment=await engagementsDatabase.Assignments
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct);
        if(assignment is null) return false;
        assignment.UpdatedAtUtc=DateTimeOffset.UtcNow;

        if(sourceId is Guid source)
        {
            var preparation=await preparationDatabase.Preparations
                .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId,ct);
            if(preparation is not null)
            {
                var binary=await preparationDatabase.Documents
                    .SingleOrDefaultAsync(x=>x.PreparationId==preparation.Id&&x.Id==source,ct);
                if(binary is not null) preparationDatabase.Documents.Remove(binary);
                preparation.UpdatedAtUtc=DateTimeOffset.UtcNow;
                await preparationDatabase.SaveChangesAsync(ct);
            }
        }

        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId,assignmentId,"lane-document-removed",
            $"{lane.Label} document removed",document.Name,actorName,DateTimeOffset.UtcNow,ct);
        return true;
    }

    public async Task<IReadOnlyList<EngagementDocument>?> GetDocumentsAsync(Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        var exists=await engagementsDatabase.Assignments.AsNoTracking()
            .AnyAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct);
        if(!exists) return null;
        return await engagementsDatabase.Documents.AsNoTracking()
            .Where(x=>x.AssignmentId==assignmentId)
            .OrderBy(x=>x.Category).ThenBy(x=>x.Name)
            .ToListAsync(ct);
    }

    private async Task<(EngagementPreparationRecord Preparation,EngagementAssignment Assignment)?> LoadAsync(
        Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        await preparationService.EnsureAsync(tenantId,assignmentId,ct);
        var p=await preparationDatabase.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId,ct);
        var a=await engagementsDatabase.Assignments.AsNoTracking()
            .Include(x=>x.Documents)
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct);
        return p is null||a is null?null:(p,a);
    }

    private async Task<(EngagementPreparationRecord Preparation,EngagementAssignment Assignment)?> LoadTrackedAsync(
        Guid tenantId,Guid assignmentId,CancellationToken ct)
    {
        await preparationService.EnsureAsync(tenantId,assignmentId,ct);
        var p=await preparationDatabase.Preparations
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.AssignmentId==assignmentId,ct);
        var a=await engagementsDatabase.Assignments
            .SingleOrDefaultAsync(x=>x.TenantId==tenantId&&x.Id==assignmentId,ct);
        return p is null||a is null?null:(p,a);
    }

    private async Task SaveAndAuditAsync(
        Guid tenantId,Guid assignmentId,string kind,string title,string detail,
        string actorSubject,string actorName,DateTimeOffset now,CancellationToken ct)
    {
        await preparationDatabase.SaveChangesAsync(ct);
        await engagementsDatabase.SaveChangesAsync(ct);
        await AddActivityAsync(tenantId,assignmentId,kind,title,detail,actorName,now,ct);
    }

    private async Task AddActivityAsync(
        Guid tenantId,Guid assignmentId,string kind,string title,string detail,
        string actor,DateTimeOffset occurredAtUtc,CancellationToken ct)
    {
        await activityDatabase.EnsureSchemaAsync(ct);
        activityDatabase.Activities.Add(new AssignmentWorkspaceActivityRecord
        {
            Id=Guid.NewGuid(),TenantId=tenantId,AssignmentId=assignmentId,
            Kind=kind,Title=title,Detail=detail,Actor=actor,OccurredAtUtc=occurredAtUtc
        });
        await activityDatabase.SaveChangesAsync(ct);
    }

    private static IReadOnlyList<HostContactInput> Contacts(EngagementPreparationRecord p,params string[] types)
    {
        var accepted=types.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return DeserializeContacts(p.ContactsJson)
            .Where(x=>accepted.Contains(x.Type))
            .ToArray();
    }

    private static IReadOnlyList<EngagementDocument> Documents(EngagementAssignment a,params string[] categories)
    {
        var accepted=categories.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return a.Documents.Where(x=>accepted.Contains(x.Category)).OrderBy(x=>x.Name).ToArray();
    }

    private static IReadOnlyList<HostContactInput> DeserializeContacts(string json)=>
        JsonSerializer.Deserialize<HostContactInput[]>(json,JsonOptions)??[];

    private static IReadOnlyList<HostScheduleItemInput> DeserializeSchedule(string json)=>
        JsonSerializer.Deserialize<HostScheduleItemInput[]>(json,JsonOptions)??[];

    private static void ValidateSchedule(IEnumerable<HostScheduleItemInput> schedule)
    {
        foreach(var item in schedule)
        {
            if(string.IsNullOrWhiteSpace(item.Title)) throw new ArgumentException("Every schedule item needs a title.");
            if(item.Title.Length>240) throw new ArgumentException("Schedule titles must be 240 characters or fewer.");
        }
    }

    private static bool TravelStarted(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.OutboundAirline)||!string.IsNullOrWhiteSpace(p.OutboundFlightNumber)||p.OutboundDepartsAtUtc is not null||
        !string.IsNullOrWhiteSpace(p.ReturnAirline)||!string.IsNullOrWhiteSpace(p.ReturnFlightNumber)||p.ReturnDepartsAtUtc is not null;

    private static bool TravelComplete(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.OutboundAirline)&&!string.IsNullOrWhiteSpace(p.OutboundFlightNumber)&&
        !string.IsNullOrWhiteSpace(p.OutboundDepartureAirport)&&!string.IsNullOrWhiteSpace(p.OutboundArrivalAirport)&&
        p.OutboundDepartsAtUtc is not null&&p.OutboundArrivesAtUtc is not null&&
        !string.IsNullOrWhiteSpace(p.ReturnAirline)&&!string.IsNullOrWhiteSpace(p.ReturnFlightNumber)&&
        !string.IsNullOrWhiteSpace(p.ReturnDepartureAirport)&&!string.IsNullOrWhiteSpace(p.ReturnArrivalAirport)&&
        p.ReturnDepartsAtUtc is not null&&p.ReturnArrivesAtUtc is not null;

    private static bool LodgingStarted(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.HotelName)||!string.IsNullOrWhiteSpace(p.HotelAddress)||p.HotelCheckInAtUtc is not null;
    private static bool LodgingComplete(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.HotelName)&&!string.IsNullOrWhiteSpace(p.HotelAddress)&&p.HotelCheckInAtUtc is not null&&p.HotelCheckOutAtUtc is not null;
    private static bool TransportationStarted(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.TransportationPlan)||!string.IsNullOrWhiteSpace(p.PickupContactName);
    private static bool TransportationComplete(EngagementPreparationRecord p)=>
        !string.IsNullOrWhiteSpace(p.TransportationPlan)&&!string.IsNullOrWhiteSpace(p.PickupContactName)&&!string.IsNullOrWhiteSpace(p.PickupContactPhone);

    private static string MediaType(string value)
    {
        var normalized=Required(value,"assetType").ToLowerInvariant();
        return MediaTypes.Contains(normalized)?normalized:throw new ArgumentException("Unsupported media asset type.");
    }
    private static string AssetStatus(string value)
    {
        var normalized=Required(value,"status").ToLowerInvariant();
        return AssetStatuses.Contains(normalized)?normalized:throw new ArgumentException("Unsupported media asset status.");
    }
    private static string Required(string? value,string field)=>
        string.IsNullOrWhiteSpace(value)?throw new ArgumentException(field+" is required."):value.Trim();
    private static string? Trim(string? value)=>string.IsNullOrWhiteSpace(value)?null:value.Trim();
}

public static class EngagementLaneOperationsEndpoints
{
    public static IEndpointRouteBuilder MapEngagementLaneOperationsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group=endpoints.MapGroup("/api/engagements/assignments/{id:guid}/lanes").RequireAuthorization();

        group.MapGet("/{laneKey}", async (
            Guid id,string laneKey,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            var allowed=await service.CanUseLaneAsync(context.User,context.Request,id,laneKey,ct);
            if(!allowed) return Results.Forbid();
            var tenantId=KingdomIdentity.TenantId(context.User,context.Request);
            object? result=EngagementResponsibilityLanes.Normalize(laneKey) switch
            {
                "travel"=>await service.GetTravelAsync(tenantId,id,ct),
                "lodging"=>await service.GetLodgingAsync(tenantId,id,ct),
                "transportation"=>await service.GetTransportationAsync(tenantId,id,ct),
                "program"=>await service.GetProgramAsync(tenantId,id,ct),
                "media"=>await service.GetMediaAsync(tenantId,id,ct),
                "documents"=>await service.GetDocumentsAsync(tenantId,id,ct),
                _=>null
            };
            return result is null?Results.NotFound():Results.Ok(result);
        });

        group.MapPut("/travel", async (
            Guid id,TravelLaneUpdate request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
            await UpdateLaneAsync("travel",id,context,service,ct,
                () => service.UpdateTravelAsync(KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Travel lead",ct)));

        group.MapPut("/lodging", async (
            Guid id,LodgingLaneUpdate request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
            await UpdateLaneAsync("lodging",id,context,service,ct,
                () => service.UpdateLodgingAsync(KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Lodging lead",ct)));

        group.MapPut("/transportation", async (
            Guid id,TransportationLaneUpdate request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
            await UpdateLaneAsync("transportation",id,context,service,ct,
                () => service.UpdateTransportationAsync(KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Transportation lead",ct)));

        group.MapPut("/program", async (
            Guid id,ProgramLaneUpdate request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
            await UpdateLaneAsync("program",id,context,service,ct,
                () => service.UpdateProgramAsync(KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Program lead",ct)));

        group.MapPut("/media", async (
            Guid id,MediaLaneUpdate request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
            await UpdateLaneAsync("media",id,context,service,ct,
                () => service.UpdateMediaAsync(KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Media lead",ct)));

        group.MapPost("/{laneKey}/documents", async (
            Guid id,string laneKey,HttpRequest request,HttpContext context,
            EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,laneKey,ct)) return Results.Forbid();
            try
            {
                if(!request.HasFormContentType) return Results.BadRequest(new {message="Upload a document using multipart form data."});
                var form=await request.ReadFormAsync(ct);
                var file=form.Files.GetFile("file");
                if(file is null) return Results.BadRequest(new {message="Choose a file to upload."});
                await using var stream=new MemoryStream();
                await file.CopyToAsync(stream,ct);
                var item=await service.AddLaneDocumentAsync(
                    KingdomIdentity.TenantId(context.User,context.Request),id,laneKey,
                    file.FileName,file.ContentType,stream.ToArray(),
                    context.User.Identity?.Name??"Engagement team member",ct);
                return item is null?Results.NotFound():Results.Ok(item);
            }
            catch(ArgumentException ex)
            {
                return Results.ValidationProblem(new Dictionary<string,string[]>{{"document",[ex.Message]}});
            }
        }).DisableAntiforgery();

        group.MapGet("/{laneKey}/documents/{documentId:guid}/content", async (
            Guid id,string laneKey,Guid documentId,bool? download,HttpContext context,
            EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,laneKey,ct)) return Results.Forbid();
            var document=await service.GetLaneDocumentContentAsync(
                KingdomIdentity.TenantId(context.User,context.Request),id,laneKey,documentId,ct);
            if(document is null) return Results.NotFound();
            return download is true
                ?Results.File(document.Content,document.ContentType,document.FileName,enableRangeProcessing:true)
                :Results.File(document.Content,document.ContentType,enableRangeProcessing:true);
        });

        group.MapDelete("/{laneKey}/documents/{documentId:guid}", async (
            Guid id,string laneKey,Guid documentId,HttpContext context,
            EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,laneKey,ct)) return Results.Forbid();
            var deleted=await service.DeleteLaneDocumentAsync(
                KingdomIdentity.TenantId(context.User,context.Request),id,laneKey,documentId,
                context.User.Identity?.Name??"Engagement team member",ct);
            return deleted?Results.NoContent():Results.NotFound();
        });

        group.MapPost("/media/assets", async (
            Guid id,CreateMediaAssetRequest request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,"media",ct)) return Results.Forbid();
            try
            {
                var item=await service.AddMediaAssetAsync(
                    KingdomIdentity.TenantId(context.User,context.Request),id,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Media lead",ct);
                return item is null?Results.NotFound():Results.Ok(item);
            }
            catch(ArgumentException ex){return Results.ValidationProblem(new Dictionary<string,string[]>{{"media",[ex.Message]}});}
        });

        group.MapPut("/media/assets/{assetId:guid}", async (
            Guid id,Guid assetId,UpdateMediaAssetRequest request,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,"media",ct)) return Results.Forbid();
            try
            {
                var item=await service.UpdateMediaAssetAsync(
                    KingdomIdentity.TenantId(context.User,context.Request),id,assetId,request,
                    KingdomIdentity.Subject(context.User,context.Request),context.User.Identity?.Name??"Media lead",ct);
                return item is null?Results.NotFound():Results.Ok(item);
            }
            catch(ArgumentException ex){return Results.ValidationProblem(new Dictionary<string,string[]>{{"media",[ex.Message]}});}
        });

        group.MapDelete("/media/assets/{assetId:guid}", async (
            Guid id,Guid assetId,HttpContext context,EngagementLaneOperationsService service,CancellationToken ct)=>
        {
            if(!await service.CanUseLaneAsync(context.User,context.Request,id,"media",ct)) return Results.Forbid();
            var deleted=await service.DeleteMediaAssetAsync(KingdomIdentity.TenantId(context.User,context.Request),id,assetId,ct);
            return deleted?Results.NoContent():Results.NotFound();
        });

        return endpoints;
    }

    private static async Task<IResult> UpdateLaneAsync<T>(
        string laneKey,Guid assignmentId,HttpContext context,EngagementLaneOperationsService service,
        CancellationToken ct,Func<Task<T?>> update) where T:class
    {
        if(!await service.CanUseLaneAsync(context.User,context.Request,assignmentId,laneKey,ct))
            return Results.Forbid();
        try
        {
            var item=await update();
            return item is null?Results.NotFound():Results.Ok(item);
        }
        catch(ArgumentException ex)
        {
            return Results.ValidationProblem(new Dictionary<string,string[]>{{laneKey,[ex.Message]}});
        }
        catch(InvalidOperationException ex)
        {
            return Results.Conflict(new {message=ex.Message});
        }
    }
}
