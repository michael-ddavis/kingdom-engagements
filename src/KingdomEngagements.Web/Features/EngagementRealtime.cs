using System.Security.Claims;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public static class EngagementRealtimeGroups
{
    public static string Internal(Guid tenantId, Guid assignmentId) =>
        $"tenant:{tenantId:N}:engagement:{assignmentId:N}:internal";

    public static string Host(Guid tenantId, Guid assignmentId, Guid accessId) =>
        $"tenant:{tenantId:N}:engagement:{assignmentId:N}:host:{accessId:N}";
}

public static class EngagementRealtimeEvents
{
    public const string MessageCreated = "engagement.message-created";
    public const string CoordinationUpdated = "engagement.coordination-updated";
    public const string DocumentAdded = "engagement.document-added";
}

public sealed record EngagementMessageCreatedEvent(
    Guid AssignmentId,
    HostCoordinationMessageDto Message);

public sealed record EngagementCoordinationUpdatedEvent(
    Guid AssignmentId,
    string UpdatedBy,
    string CoordinationStatus,
    DateTimeOffset UpdatedAtUtc);

public sealed record EngagementDocumentAddedEvent(
    Guid AssignmentId,
    string UpdatedBy,
    HostCoordinationDocumentDto Document);

public sealed class EngagementRealtimeHub(
    EngagementResponsibilityService responsibilities,
    HostAccessDbContext hostAccessDatabase,
    ICurrentTenantAccessor tenantContext) : Hub
{
    public const string InternalRoute = "/hubs/engagements";
    public const string HostRoute = "/hubs/engagements/host";

    public async Task JoinEngagement(Guid assignmentId)
    {
        var user = Context.User;
        if (user is null || user.Identity?.IsAuthenticated != true)
            throw new HubException("Authentication is required.");

        if (HostAccessIdentity.AccessId(user) is Guid hostAccessId)
        {
            await JoinAsHostAsync(user, hostAccessId, assignmentId);
            return;
        }

        await JoinAsInternalUserAsync(user, assignmentId);
    }

    private async Task JoinAsHostAsync(
        ClaimsPrincipal user,
        Guid accessId,
        Guid assignmentId)
    {
        var tenantId = HostAccessIdentity.TenantId(user);
        var assignedEngagementId = HostAccessIdentity.AssignmentId(user);

        if (tenantId is null || assignedEngagementId != assignmentId)
            throw new HubException("This host session cannot access the requested engagement.");

        using var tenantScope = tenantContext.BeginTenantScope(
            tenantId.Value,
            "Authorize host realtime group membership.");

        var now = DateTimeOffset.UtcNow;
        var accessIsActive = await hostAccessDatabase.Invitations.AsNoTracking().AnyAsync(invitation =>
            invitation.Id == accessId &&
            invitation.TenantId == tenantId.Value &&
            invitation.AssignmentId == assignmentId &&
            invitation.RedeemedAtUtc != null &&
            invitation.RevokedAtUtc == null &&
            invitation.ExpiresAtUtc > now);

        if (!accessIsActive)
            throw new HubException("This host session is no longer active.");

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            EngagementRealtimeGroups.Host(tenantId.Value, assignmentId, accessId));
    }

    private async Task JoinAsInternalUserAsync(
        ClaimsPrincipal user,
        Guid assignmentId)
    {
        var tenantClaim = user.FindFirstValue(KingdomIdentity.TenantClaim);
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            throw new HubException("A tenant is required for realtime engagement access.");

        using var tenantScope = tenantContext.BeginTenantScope(
            tenantId,
            "Authorize internal realtime group membership.");

        var subject = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
        var allowed = KingdomIdentity.CanDirectEngagements(user) ||
                      await responsibilities.IsEffectiveOwnerAsync(
                          tenantId,
                          assignmentId,
                          "host-coordination",
                          subject,
                          Context.ConnectionAborted);

        if (!allowed)
            throw new HubException("You do not have access to this engagement conversation.");

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            EngagementRealtimeGroups.Internal(tenantId, assignmentId));
    }
}

public sealed class EngagementRealtimePublisher(
    IHubContext<EngagementRealtimeHub> hub,
    HostAccessDbContext hostAccessDatabase,
    ICurrentTenantAccessor tenantContext)
{
    public Task MessageCreatedAsync(
        Guid tenantId,
        Guid assignmentId,
        HostCoordinationMessageDto message,
        CancellationToken cancellationToken) =>
        PublishAsync(
            tenantId,
            assignmentId,
            EngagementRealtimeEvents.MessageCreated,
            new EngagementMessageCreatedEvent(assignmentId, message),
            cancellationToken);

    public Task CoordinationUpdatedAsync(
        Guid tenantId,
        Guid assignmentId,
        string updatedBy,
        string coordinationStatus,
        CancellationToken cancellationToken) =>
        PublishAsync(
            tenantId,
            assignmentId,
            EngagementRealtimeEvents.CoordinationUpdated,
            new EngagementCoordinationUpdatedEvent(
                assignmentId,
                updatedBy,
                coordinationStatus,
                DateTimeOffset.UtcNow),
            cancellationToken);

    public Task DocumentAddedAsync(
        Guid tenantId,
        Guid assignmentId,
        string updatedBy,
        HostCoordinationDocumentDto document,
        CancellationToken cancellationToken) =>
        PublishAsync(
            tenantId,
            assignmentId,
            EngagementRealtimeEvents.DocumentAdded,
            new EngagementDocumentAddedEvent(assignmentId, updatedBy, document),
            cancellationToken);

    private async Task PublishAsync(
        Guid tenantId,
        Guid assignmentId,
        string eventName,
        object payload,
        CancellationToken cancellationToken)
    {
        using var tenantScope = tenantContext.BeginTenantScope(
            tenantId,
            "Publish engagement realtime events only inside the owning tenant.");

        await hostAccessDatabase.EnsureSchemaAsync(cancellationToken);

        await hub.Clients
            .Group(EngagementRealtimeGroups.Internal(tenantId, assignmentId))
            .SendAsync(eventName, payload, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var activeHostAccessIds = await hostAccessDatabase.Invitations.AsNoTracking()
            .Where(invitation =>
                invitation.TenantId == tenantId &&
                invitation.AssignmentId == assignmentId &&
                invitation.RedeemedAtUtc != null &&
                invitation.RevokedAtUtc == null &&
                invitation.ExpiresAtUtc > now)
            .Select(invitation => invitation.Id)
            .ToListAsync(cancellationToken);

        foreach (var accessId in activeHostAccessIds)
        {
            await hub.Clients
                .Group(EngagementRealtimeGroups.Host(tenantId, assignmentId, accessId))
                .SendAsync(eventName, payload, cancellationToken);
        }
    }
}
