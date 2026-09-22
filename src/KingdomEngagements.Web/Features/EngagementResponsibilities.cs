using System.Security.Claims;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed record ResponsibilityLaneDefinition(
    string Key,
    string Label,
    string Group,
    bool DefaultApplicable,
    string Description);

public static class EngagementResponsibilityLanes
{
    public static readonly IReadOnlyList<ResponsibilityLaneDefinition> All =
    [
        new("host-coordination", "Host Coordination", "Coordination", true, "Host contact, coordination, venue information, and missing host details."),
        new("travel", "Travel", "Logistics", true, "Flights, itinerary, confirmations, and arrival/departure details."),
        new("lodging", "Lodging", "Logistics", true, "Hotel, room, check-in/out, and lodging confirmations."),
        new("transportation", "Ground Transportation", "Logistics", true, "Airport pickup, drivers, rental vehicles, and local movement."),
        new("media", "Media & Creative", "Preparation", true, "Headshots, flyers, logos, promotional assets, images, video, and social content."),
        new("program", "Program & Schedule", "Preparation", true, "Sessions, service times, soundcheck, meetings, and engagement itinerary."),
        new("documents", "Documents & Agreements", "Administration", true, "Agreements, riders, official documents, and required files."),
        new("finance", "Finance & Honorarium", "Administration", true, "Honorarium, reimbursement, agreed expenses, and payment status."),
        new("ministry-preparation", "Ministry Preparation", "Preparation", true, "Ministry request, audience, prayer focus, theme, and ministry notes."),
        new("hospitality", "Hospitality", "Logistics", true, "Meals, green room, dietary needs, local host care, and accommodations."),
        new("closeout", "Closeout & Follow-up", "Follow-up", false, "Final payment, host follow-up, outcomes, testimony, documents, and closeout."),
        new("production", "Production / AV", "Optional", false, "Livestream, microphones, screens, recording, stage, and technical requirements."),
        new("security-protocol", "Security / Protocol", "Optional", false, "Security, escorts, access, VIP movement, and arrival protocol."),
        new("resources-merchandise", "Resources / Merchandise", "Optional", false, "Books, product tables, shipping, inventory, and event resources.")
    ];

    public static ResponsibilityLaneDefinition Get(string value)
    {
        var key = Normalize(value);
        return All.FirstOrDefault(item => item.Key == key)
            ?? throw new ArgumentException("The responsibility lane is not supported.", nameof(value));
    }

    public static string Normalize(string value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant().Replace('_', '-');
        return normalized switch
        {
            "host" => "host-coordination",
            "ground-transportation" or "local-transportation" or "transport" => "transportation",
            "media-creative" => "media",
            "schedule" or "program-schedule" => "program",
            "ministry" or "ministry-prep" => "ministry-preparation",
            "security" or "protocol" => "security-protocol",
            "resources" or "merchandise" => "resources-merchandise",
            _ => normalized
        };
    }
}

public sealed class StandingResponsibilityAssignment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string LaneKey { get; set; } = string.Empty;
    public string UserSubject { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public string UpdatedBySubject { get; set; } = string.Empty;
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class EngagementResponsibilityOverride
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string LaneKey { get; set; } = string.Empty;
    public string UserSubject { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public string UpdatedBySubject { get; set; } = string.Empty;
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed class EngagementLaneProgress
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string LaneKey { get; set; } = string.Empty;
    public bool IsApplicable { get; set; } = true;
    public string Status { get; set; } = "not-started";
    public string? Detail { get; set; }
    public DateTimeOffset? DueAtUtc { get; set; }
    public string UpdatedBySubject { get; set; } = string.Empty;
    public string UpdatedByName { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public string? CompletedBySubject { get; set; }
    public string? CompletedByName { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed record ResponsibilityOwner(
    string UserSubject,
    string DisplayName,
    string? Email,
    string Source);

public sealed record ResponsibilityLaneState(
    string Key,
    string Label,
    string Group,
    string Description,
    bool IsApplicable,
    string Status,
    string? Detail,
    DateTimeOffset? DueAtUtc,
    bool IsOverdue,
    ResponsibilityOwner? Owner,
    string? UpdatedByName,
    DateTimeOffset? UpdatedAtUtc,
    string? CompletedByName,
    DateTimeOffset? CompletedAtUtc);

public sealed record EngagementResponsibilitySnapshot(
    EngagementSummary Assignment,
    IReadOnlyList<ResponsibilityLaneState> Lanes,
    int ResponsibilityReadinessPercent,
    int HostCoordinationPercent,
    int CompletedLaneCount,
    int ApplicableLaneCount,
    int OverdueLaneCount,
    int UnassignedLaneCount);

public sealed record MyResponsibilityWorkItem(
    EngagementSummary Assignment,
    ResponsibilityLaneState Lane);

public sealed record AssignResponsibilityOwnerRequest(
    string UserSubject,
    string DisplayName,
    string? Email);

public sealed record ConfigureEngagementLaneRequest(
    bool IsApplicable,
    DateTimeOffset? DueAtUtc);

public sealed record UpdateEngagementLaneProgressRequest(
    string Status,
    string? Detail);

public sealed class EngagementResponsibilityService(EngagementsDbContext database)
{
    private static readonly HashSet<string> ProgressStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "not-started",
        "in-progress",
        "waiting-on-host",
        "blocked",
        "ready-for-review",
        "complete",
        "overdue",
        "not-applicable"
    };

    public IReadOnlyList<ResponsibilityLaneDefinition> GetCatalog() =>
        EngagementResponsibilityLanes.All;

    public async Task<IReadOnlyList<StandingResponsibilityAssignment>> GetStandingAssignmentsAsync(
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await database.StandingResponsibilityAssignments
            .AsNoTracking()
            .Where(item => item.TenantId == tenantId && item.IsActive)
            .OrderBy(item => item.LaneKey)
            .ToListAsync(cancellationToken);

    public async Task<StandingResponsibilityAssignment> SetStandingOwnerAsync(
        Guid tenantId,
        string laneKey,
        AssignResponsibilityOwnerRequest request,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var userSubject = Required(request.UserSubject, nameof(request.UserSubject));
        var displayName = Required(request.DisplayName, nameof(request.DisplayName));
        var email = Clean(request.Email);
        var now = DateTimeOffset.UtcNow;

        var item = await database.StandingResponsibilityAssignments
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.LaneKey == lane.Key, cancellationToken);

        if (item is null)
        {
            item = new StandingResponsibilityAssignment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                LaneKey = lane.Key
            };
            database.StandingResponsibilityAssignments.Add(item);
        }

        item.UserSubject = userSubject;
        item.DisplayName = displayName;
        item.Email = email;
        item.IsActive = true;
        item.UpdatedBySubject = actorSubject;
        item.UpdatedByName = actorName;
        item.UpdatedAtUtc = now;

        await SyncTaskOwnersAsync(
            tenantId,
            assignmentId: null,
            lane.Key,
            userSubject,
            displayName,
            skipEngagementOverrides: true,
            now,
            cancellationToken);

        await database.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<bool> ClearStandingOwnerAsync(
        Guid tenantId,
        string laneKey,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var item = await database.StandingResponsibilityAssignments
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.LaneKey == lane.Key, cancellationToken);
        if (item is null) return false;

        database.StandingResponsibilityAssignments.Remove(item);
        await SyncTaskOwnersAsync(
            tenantId,
            assignmentId: null,
            lane.Key,
            userSubject: null,
            displayName: "Unassigned",
            skipEngagementOverrides: true,
            DateTimeOffset.UtcNow,
            cancellationToken);

        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<EngagementResponsibilityOverride?> SetEngagementOwnerAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        AssignResponsibilityOwnerRequest request,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        if (!await AssignmentExistsAsync(tenantId, assignmentId, cancellationToken)) return null;

        var now = DateTimeOffset.UtcNow;
        var item = await database.EngagementResponsibilityOverrides
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.LaneKey == lane.Key,
                cancellationToken);

        if (item is null)
        {
            item = new EngagementResponsibilityOverride
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AssignmentId = assignmentId,
                LaneKey = lane.Key
            };
            database.EngagementResponsibilityOverrides.Add(item);
        }

        item.UserSubject = Required(request.UserSubject, nameof(request.UserSubject));
        item.DisplayName = Required(request.DisplayName, nameof(request.DisplayName));
        item.Email = Clean(request.Email);
        item.IsActive = true;
        item.UpdatedBySubject = actorSubject;
        item.UpdatedByName = actorName;
        item.UpdatedAtUtc = now;

        await SyncTaskOwnersAsync(
            tenantId,
            assignmentId,
            lane.Key,
            item.UserSubject,
            item.DisplayName,
            skipEngagementOverrides: false,
            now,
            cancellationToken);

        await database.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<bool> ClearEngagementOwnerAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var item = await database.EngagementResponsibilityOverrides
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.LaneKey == lane.Key,
                cancellationToken);
        if (item is null) return false;

        database.EngagementResponsibilityOverrides.Remove(item);

        var standingOwner = await database.StandingResponsibilityAssignments.AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.LaneKey == lane.Key && x.IsActive,
                cancellationToken);

        await SyncTaskOwnersAsync(
            tenantId,
            assignmentId,
            lane.Key,
            standingOwner?.UserSubject,
            standingOwner?.DisplayName ?? "Unassigned",
            skipEngagementOverrides: false,
            DateTimeOffset.UtcNow,
            cancellationToken);

        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ResponsibilityLaneState?> ConfigureLaneAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        ConfigureEngagementLaneRequest request,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        if (!await AssignmentExistsAsync(tenantId, assignmentId, cancellationToken)) return null;

        var progress = await GetOrCreateProgressAsync(
            tenantId,
            assignmentId,
            lane,
            actorSubject,
            actorName,
            cancellationToken);

        progress.IsApplicable = request.IsApplicable;
        progress.DueAtUtc = request.DueAtUtc;
        if (!request.IsApplicable)
        {
            progress.Status = "not-applicable";
            progress.CompletedBySubject = null;
            progress.CompletedByName = null;
            progress.CompletedAtUtc = null;
        }
        else if (progress.Status == "not-applicable")
        {
            progress.Status = "not-started";
        }

        progress.UpdatedBySubject = actorSubject;
        progress.UpdatedByName = actorName;
        progress.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);

        return await GetLaneAsync(tenantId, assignmentId, lane.Key, cancellationToken);
    }

    public async Task<ResponsibilityLaneState?> UpdateProgressAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        UpdateEngagementLaneProgressRequest request,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var status = NormalizeStatus(request.Status);
        if (!await AssignmentExistsAsync(tenantId, assignmentId, cancellationToken)) return null;

        var progress = await GetOrCreateProgressAsync(
            tenantId,
            assignmentId,
            lane,
            actorSubject,
            actorName,
            cancellationToken);

        if (!progress.IsApplicable)
            throw new InvalidOperationException("This responsibility lane is marked not applicable for the engagement.");

        var now = DateTimeOffset.UtcNow;
        progress.Status = status;
        progress.Detail = Clean(request.Detail);
        progress.UpdatedBySubject = actorSubject;
        progress.UpdatedByName = actorName;
        progress.UpdatedAtUtc = now;

        if (status == "complete")
        {
            progress.CompletedBySubject = actorSubject;
            progress.CompletedByName = actorName;
            progress.CompletedAtUtc = now;
        }
        else
        {
            progress.CompletedBySubject = null;
            progress.CompletedByName = null;
            progress.CompletedAtUtc = null;
        }

        await database.SaveChangesAsync(cancellationToken);
        return await GetLaneAsync(tenantId, assignmentId, lane.Key, cancellationToken);
    }

    public async Task<IReadOnlyList<ResponsibilityLaneState>?> GetAssignmentLanesAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is null) return null;

        var standing = await database.StandingResponsibilityAssignments.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.IsActive)
            .ToDictionaryAsync(x => x.LaneKey, cancellationToken);

        var overrides = await database.EngagementResponsibilityOverrides.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.IsActive)
            .ToDictionaryAsync(x => x.LaneKey, cancellationToken);

        var progress = await database.EngagementLaneProgress.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .ToDictionaryAsync(x => x.LaneKey, cancellationToken);

        return EngagementResponsibilityLanes.All
            .Select(lane => BuildLaneState(assignment, lane, standing, overrides, progress))
            .ToArray();
    }

    public async Task<ResponsibilityLaneState?> GetLaneAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        var lanes = await GetAssignmentLanesAsync(tenantId, assignmentId, cancellationToken);
        return lanes?.Single(item => item.Key == lane.Key);
    }

    public async Task<bool> IsEffectiveOwnerAsync(
        Guid tenantId,
        Guid assignmentId,
        string laneKey,
        string userSubject,
        CancellationToken cancellationToken)
    {
        var lane = EngagementResponsibilityLanes.Get(laneKey);
        if (!await AssignmentExistsAsync(tenantId, assignmentId, cancellationToken)) return false;

        var engagementOwner = await database.EngagementResponsibilityOverrides.AsNoTracking()
            .Where(x => x.TenantId == tenantId &&
                        x.AssignmentId == assignmentId &&
                        x.LaneKey == lane.Key &&
                        x.IsActive)
            .Select(x => x.UserSubject)
            .SingleOrDefaultAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(engagementOwner))
            return string.Equals(engagementOwner, userSubject, StringComparison.OrdinalIgnoreCase);

        var standingOwner = await database.StandingResponsibilityAssignments.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.LaneKey == lane.Key && x.IsActive)
            .Select(x => x.UserSubject)
            .SingleOrDefaultAsync(cancellationToken);

        return string.Equals(standingOwner, userSubject, StringComparison.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyList<EngagementResponsibilitySnapshot>> GetCommandCenterAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var assignments = await database.Assignments.AsNoTracking()
            .Include(x => x.Tasks)
            .Where(x => x.TenantId == tenantId &&
                        x.Status != "complete" &&
                        x.Status != "completed" &&
                        x.Status != "archived" &&
                        x.Status != "cancelled")
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync(cancellationToken);

        var result = new List<EngagementResponsibilitySnapshot>();
        foreach (var assignment in assignments)
        {
            var lanes = await GetAssignmentLanesAsync(tenantId, assignment.Id, cancellationToken)
                ?? Array.Empty<ResponsibilityLaneState>();
            var applicable = lanes.Where(lane => lane.IsApplicable).ToArray();
            var completed = applicable.Count(lane => lane.Status == "complete");
            var readiness = applicable.Length == 0
                ? 100
                : (int)Math.Round(completed / (double)applicable.Length * 100);
            var overdue = applicable.Count(lane => lane.IsOverdue);
            var unassigned = applicable.Count(lane => lane.Owner is null);

            result.Add(new EngagementResponsibilitySnapshot(
                MapSummary(assignment),
                lanes,
                readiness,
                0,
                completed,
                applicable.Length,
                overdue,
                unassigned));
        }

        return result;
    }

    public async Task<IReadOnlyList<MyResponsibilityWorkItem>> GetMyWorkAsync(
        Guid tenantId,
        string userSubject,
        CancellationToken cancellationToken)
    {
        var commandCenter = await GetCommandCenterAsync(tenantId, cancellationToken);
        return commandCenter
            .SelectMany(item => item.Lanes
                .Where(lane => lane.Owner is not null &&
                               string.Equals(lane.Owner.UserSubject, userSubject, StringComparison.OrdinalIgnoreCase))
                .Select(lane => new MyResponsibilityWorkItem(item.Assignment, lane)))
            .OrderBy(item => item.Lane.DueAtUtc ?? item.Assignment.StartsAtUtc ?? DateTimeOffset.MaxValue)
            .ToArray();
    }

    private async Task SyncTaskOwnersAsync(
        Guid tenantId,
        Guid? assignmentId,
        string laneKey,
        string? userSubject,
        string displayName,
        bool skipEngagementOverrides,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var query = database.Tasks
            .Include(task => task.Assignment)
            .Where(task => task.Assignment != null && task.Assignment.TenantId == tenantId);

        if (assignmentId is Guid id)
            query = query.Where(task => task.AssignmentId == id);

        var tasks = await query.ToListAsync(cancellationToken);
        var overriddenAssignments = new HashSet<Guid>();

        if (skipEngagementOverrides)
        {
            var overriddenIds = await database.EngagementResponsibilityOverrides.AsNoTracking()
                .Where(item => item.TenantId == tenantId && item.LaneKey == laneKey && item.IsActive)
                .Select(item => item.AssignmentId)
                .ToListAsync(cancellationToken);
            overriddenAssignments = overriddenIds.ToHashSet();
        }

        foreach (var task in tasks)
        {
            if (!string.Equals(
                    EngagementResponsibilityLanes.Normalize(task.Category),
                    laneKey,
                    StringComparison.OrdinalIgnoreCase))
                continue;
            if (skipEngagementOverrides && overriddenAssignments.Contains(task.AssignmentId))
                continue;

            task.Owner = displayName;
            task.OwnerSubject = userSubject;
            task.UpdatedAtUtc = now;
            if (task.Assignment is not null)
                task.Assignment.UpdatedAtUtc = now;
        }
    }

    private async Task<EngagementLaneProgress> GetOrCreateProgressAsync(
        Guid tenantId,
        Guid assignmentId,
        ResponsibilityLaneDefinition lane,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var item = await database.EngagementLaneProgress.SingleOrDefaultAsync(
            x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.LaneKey == lane.Key,
            cancellationToken);

        if (item is not null) return item;

        item = new EngagementLaneProgress
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            LaneKey = lane.Key,
            IsApplicable = lane.DefaultApplicable,
            Status = lane.DefaultApplicable ? "not-started" : "not-applicable",
            UpdatedBySubject = actorSubject,
            UpdatedByName = actorName,
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
        database.EngagementLaneProgress.Add(item);
        return item;
    }

    private async Task<bool> AssignmentExistsAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken) =>
        await database.Assignments.AsNoTracking()
            .AnyAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);

    private static ResponsibilityLaneState BuildLaneState(
        EngagementAssignment assignment,
        ResponsibilityLaneDefinition lane,
        IReadOnlyDictionary<string, StandingResponsibilityAssignment> standing,
        IReadOnlyDictionary<string, EngagementResponsibilityOverride> overrides,
        IReadOnlyDictionary<string, EngagementLaneProgress> progress)
    {
        progress.TryGetValue(lane.Key, out var laneProgress);

        var isApplicable = laneProgress?.IsApplicable ?? lane.DefaultApplicable;
        var storedStatus = laneProgress?.Status ?? InferStatus(assignment, lane.Key);
        var status = isApplicable ? storedStatus : "not-applicable";
        var overdue = isApplicable &&
                      status != "complete" &&
                      laneProgress?.DueAtUtc is DateTimeOffset due &&
                      due < DateTimeOffset.UtcNow;

        ResponsibilityOwner? owner = null;
        if (overrides.TryGetValue(lane.Key, out var engagementOwner))
        {
            owner = new ResponsibilityOwner(
                engagementOwner.UserSubject,
                engagementOwner.DisplayName,
                engagementOwner.Email,
                "engagement");
        }
        else if (standing.TryGetValue(lane.Key, out var standingOwner))
        {
            owner = new ResponsibilityOwner(
                standingOwner.UserSubject,
                standingOwner.DisplayName,
                standingOwner.Email,
                "standing");
        }

        return new ResponsibilityLaneState(
            lane.Key,
            lane.Label,
            lane.Group,
            lane.Description,
            isApplicable,
            overdue ? "overdue" : status,
            laneProgress?.Detail,
            laneProgress?.DueAtUtc,
            overdue,
            owner,
            laneProgress?.UpdatedByName,
            laneProgress?.UpdatedAtUtc,
            laneProgress?.CompletedByName,
            laneProgress?.CompletedAtUtc);
    }

    private static string InferStatus(EngagementAssignment assignment, string laneKey)
    {
        var status = laneKey switch
        {
            "host-coordination" => assignment.HostStatus,
            "travel" => assignment.TravelStatus,
            "lodging" => assignment.LodgingStatus,
            "transportation" => assignment.TransportationStatus,
            "documents" => assignment.DocumentsStatus,
            "closeout" => assignment.CloseoutStatus,
            _ => "not-started"
        };

        return status.Trim().ToLowerInvariant() switch
        {
            "complete" or "completed" or "confirmed" or "received" or "ready" or "waived" => "complete",
            "in-progress" or "planning" => "in-progress",
            "needs-attention" => "blocked",
            "not-started" or "pending" or "" => "not-started",
            var value => ProgressStatuses.Contains(value) ? value : "not-started"
        };
    }

    private static string NormalizeStatus(string value)
    {
        var normalized = Required(value, nameof(value)).ToLowerInvariant().Replace('_', '-');
        return ProgressStatuses.Contains(normalized)
            ? normalized
            : throw new ArgumentException("The responsibility status is not supported.", nameof(value));
    }

    private static EngagementSummary MapSummary(EngagementAssignment assignment)
    {
        var readinessStatuses = new[]
        {
            assignment.TravelStatus,
            assignment.LodgingStatus,
            assignment.TransportationStatus,
            assignment.HostStatus,
            assignment.DocumentsStatus
        };
        var readiness = readinessStatuses.Count(status =>
            status is "complete" or "confirmed" or "received" or "waived");
        var percent = (int)Math.Round(readiness / (double)readinessStatuses.Length * 100);

        return new EngagementSummary(
            assignment.Id,
            assignment.ExternalAssignmentId,
            assignment.Title,
            assignment.SpeakerName,
            assignment.HostOrganization,
            assignment.Location,
            assignment.StartsAtUtc,
            assignment.Status,
            percent,
            assignment.Tasks.Count(task => task.Status != "complete"),
            assignment.TravelStatus,
            assignment.LodgingStatus,
            assignment.TransportationStatus,
            assignment.HostStatus,
            assignment.DocumentsStatus,
            assignment.CloseoutStatus,
            assignment.UpdatedAtUtc);
    }

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException(field + " is required.")
            : value.Trim();

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static class EngagementResponsibilityEndpoints
{
    public static IEndpointRouteBuilder MapEngagementResponsibilityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements").RequireAuthorization();

        group.MapGet("/responsibility-lanes", (EngagementResponsibilityService service) =>
            Results.Ok(service.GetCatalog()));

        group.MapGet("/responsibilities/standing", async (
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            return Results.Ok(await service.GetStandingAssignmentsAsync(tenantId, ct));
        }).RequireAuthorization("EngagementsDirect");

        group.MapPut("/responsibilities/standing/{laneKey}", async (
            string laneKey,
            AssignResponsibilityOwnerRequest request,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
                var item = await service.SetStandingOwnerAsync(
                    tenantId,
                    laneKey,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Engagement Director",
                    ct);
                return Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsDirect");

        group.MapDelete("/responsibilities/standing/{laneKey}", async (
            string laneKey,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var deleted = await service.ClearStandingOwnerAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    laneKey,
                    ct);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsDirect");

        group.MapGet("/assignments/{id:guid}/responsibilities", async (
            Guid id,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            var lanes = await service.GetAssignmentLanesAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                ct);
            return lanes is null ? Results.NotFound() : Results.Ok(lanes);
        });

        group.MapPut("/assignments/{id:guid}/responsibilities/{laneKey}/owner", async (
            Guid id,
            string laneKey,
            AssignResponsibilityOwnerRequest request,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.SetEngagementOwnerAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Engagement Director",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsDirect");

        group.MapDelete("/assignments/{id:guid}/responsibilities/{laneKey}/owner", async (
            Guid id,
            string laneKey,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var deleted = await service.ClearEngagementOwnerAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    ct);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsDirect");

        group.MapPut("/assignments/{id:guid}/responsibilities/{laneKey}/configuration", async (
            Guid id,
            string laneKey,
            ConfigureEngagementLaneRequest request,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.ConfigureLaneAsync(
                    KingdomIdentity.TenantId(context.User, context.Request),
                    id,
                    laneKey,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Engagement Director",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsDirect");

        group.MapPut("/assignments/{id:guid}/responsibilities/{laneKey}/progress", async (
            Guid id,
            string laneKey,
            UpdateEngagementLaneProgressRequest request,
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            try
            {
                var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
                var subject = KingdomIdentity.Subject(context.User, context.Request);
                var canEdit = KingdomIdentity.CanDirectEngagements(context.User) ||
                              await service.IsEffectiveOwnerAsync(tenantId, id, laneKey, subject, ct);
                if (!canEdit) return Results.Forbid();

                var item = await service.UpdateProgressAsync(
                    tenantId,
                    id,
                    laneKey,
                    request,
                    subject,
                    context.User.Identity?.Name ?? "Engagement team member",
                    ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsibility"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        group.MapGet("/command-center", async (
            HttpContext context,
            EngagementResponsibilityService service,
            AssignmentWorkspaceService workspace,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var items = await service.GetCommandCenterAsync(tenantId, ct);
            var enriched = new List<EngagementResponsibilitySnapshot>(items.Count);

            foreach (var item in items)
            {
                var assignmentWorkspace = await workspace.GetAsync(
                    tenantId,
                    item.Assignment.Id,
                    ct);
                enriched.Add(item with
                {
                    HostCoordinationPercent = assignmentWorkspace?.Readiness.OverallPercent ?? 0
                });
            }

            return Results.Ok(enriched);
        }).RequireAuthorization("EngagementsDirect");

        group.MapGet("/my-work", async (
            HttpContext context,
            EngagementResponsibilityService service,
            CancellationToken ct) =>
        {
            var items = await service.GetMyWorkAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                KingdomIdentity.Subject(context.User, context.Request),
                ct);
            return Results.Ok(items);
        });

        return endpoints;
    }
}
