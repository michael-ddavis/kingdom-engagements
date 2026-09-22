using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Web.Features;

public static class EngagementRealtimeEvents
{
    public const string MessageCreated = "coordinationMessageCreated";
    public const string CoordinationUpdated = "coordinationUpdated";
    public const string DocumentAdded = "coordinationDocumentAdded";
}

public sealed record EngagementRealtimeScope(
    Guid TenantId,
    Guid AssignmentId,
    string ParticipantType);

public sealed record EngagementCoordinationUpdatedEvent(
    Guid AssignmentId,
    string Source,
    string CoordinationStatus,
    DateTimeOffset? SubmittedAtUtc,
    DateTimeOffset OccurredAtUtc);

public sealed record EngagementDocumentAddedEvent(
    Guid AssignmentId,
    string Source,
    HostCoordinationDocumentDto Document,
    DateTimeOffset OccurredAtUtc);

public sealed class EngagementRealtimeAccessService(
    HostAccessDbContext hostAccessDatabase,
    EngagementsDbContext engagementsDatabase,
    EngagementResponsibilityService responsibilities)
{
    public async Task<bool> HasIdentityAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (httpContext.User.Identity?.IsAuthenticated == true)
            return true;

        var host = await httpContext.AuthenticateAsync(HostAccessIdentity.Scheme);
        if (!host.Succeeded || host.Principal is null)
            return false;

        return await IsActiveHostSessionAsync(host.Principal, cancellationToken);
    }

    public async Task<EngagementRealtimeScope?> ResolveAsync(
        HttpContext httpContext,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        if (assignmentId == Guid.Empty)
            return null;

        var host = await httpContext.AuthenticateAsync(HostAccessIdentity.Scheme);
        if (host.Succeeded && host.Principal is not null)
        {
            var hostScope = await ResolveHostAsync(
                host.Principal,
                assignmentId,
                cancellationToken);

            if (hostScope is not null)
                return hostScope;
        }

        return await ResolveInternalUserAsync(
            httpContext,
            assignmentId,
            cancellationToken);
    }

    private async Task<EngagementRealtimeScope?> ResolveHostAsync(
        System.Security.Claims.ClaimsPrincipal principal,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        var accessId = HostAccessIdentity.AccessId(principal);
        var tenantId = HostAccessIdentity.TenantId(principal);
        var assignedEngagementId = HostAccessIdentity.AssignmentId(principal);

        if (accessId is null ||
            tenantId is null ||
            assignedEngagementId is null ||
            assignedEngagementId.Value != assignmentId)
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        var isActive = await hostAccessDatabase.Invitations.AsNoTracking().AnyAsync(
            invitation =>
                invitation.Id == accessId.Value &&
                invitation.TenantId == tenantId.Value &&
                invitation.AssignmentId == assignmentId &&
                invitation.RedeemedAtUtc != null &&
                invitation.RevokedAtUtc == null &&
                invitation.ExpiresAtUtc > now,
            cancellationToken);

        return isActive
            ? new EngagementRealtimeScope(tenantId.Value, assignmentId, "host")
            : null;
    }

    private async Task<EngagementRealtimeScope?> ResolveInternalUserAsync(
        HttpContext httpContext,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        var principal = httpContext.User;
        if (principal.Identity?.IsAuthenticated != true)
            return null;

        var tenantId = KingdomIdentity.TenantId(principal, httpContext.Request);

        var assignmentExists = await engagementsDatabase.Assignments.AsNoTracking().AnyAsync(
            assignment => assignment.TenantId == tenantId && assignment.Id == assignmentId,
            cancellationToken);

        if (!assignmentExists)
            return null;

        var subject = KingdomIdentity.Subject(principal, httpContext.Request);
        var canCoordinate =
            KingdomIdentity.CanDirectEngagements(principal) ||
            await responsibilities.IsEffectiveOwnerAsync(
                tenantId,
                assignmentId,
                "host-coordination",
                subject,
                cancellationToken);

        return canCoordinate
            ? new EngagementRealtimeScope(tenantId, assignmentId, "internal")
            : null;
    }

    private async Task<bool> IsActiveHostSessionAsync(
        System.Security.Claims.ClaimsPrincipal principal,
        CancellationToken cancellationToken)
    {
        var accessId = HostAccessIdentity.AccessId(principal);
        var tenantId = HostAccessIdentity.TenantId(principal);
        var assignmentId = HostAccessIdentity.AssignmentId(principal);

        if (accessId is null || tenantId is null || assignmentId is null)
            return false;

        var now = DateTimeOffset.UtcNow;
        return await hostAccessDatabase.Invitations.AsNoTracking().AnyAsync(
            invitation =>
                invitation.Id == accessId.Value &&
                invitation.TenantId == tenantId.Value &&
                invitation.AssignmentId == assignmentId.Value &&
                invitation.RedeemedAtUtc != null &&
                invitation.RevokedAtUtc == null &&
                invitation.ExpiresAtUtc > now,
            cancellationToken);
    }
}

public sealed class EngagementRealtimeHub(
    EngagementRealtimeAccessService accessService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        if (httpContext is null ||
            !await accessService.HasIdentityAsync(
                httpContext,
                Context.ConnectionAborted))
        {
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public async Task JoinEngagement(Guid assignmentId)
    {
        var httpContext = Context.GetHttpContext();
        if (httpContext is null)
            throw new HubException("The realtime connection does not have an HTTP context.");

        var scope = await accessService.ResolveAsync(
            httpContext,
            assignmentId,
            Context.ConnectionAborted);

        if (scope is null)
            throw new HubException("You do not have access to realtime coordination for this engagement.");

        var groupName = ApostolOsRealtimeGroups.ForResource(
            scope.TenantId,
            "engagement",
            scope.AssignmentId);

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            groupName,
            Context.ConnectionAborted);
    }
}

public sealed class EngagementRealtimeNotifier(
    IHubContext<EngagementRealtimeHub> hub)
{
    public Task MessageCreatedAsync(
        Guid tenantId,
        Guid assignmentId,
        HostCoordinationMessageDto message,
        CancellationToken cancellationToken)
    {
        var groupName = ApostolOsRealtimeGroups.ForResource(
            tenantId,
            "engagement",
            assignmentId);

        return hub.Clients.Group(groupName).SendAsync(
            EngagementRealtimeEvents.MessageCreated,
            message,
            cancellationToken);
    }

    public Task CoordinationUpdatedAsync(
        Guid tenantId,
        Guid assignmentId,
        string source,
        HostCoordinationDetails coordination,
        CancellationToken cancellationToken)
    {
        var groupName = ApostolOsRealtimeGroups.ForResource(
            tenantId,
            "engagement",
            assignmentId);

        var notification = new EngagementCoordinationUpdatedEvent(
            assignmentId,
            source,
            coordination.CoordinationStatus,
            coordination.SubmittedAtUtc,
            DateTimeOffset.UtcNow);

        return hub.Clients.Group(groupName).SendAsync(
            EngagementRealtimeEvents.CoordinationUpdated,
            notification,
            cancellationToken);
    }

    public Task DocumentAddedAsync(
        Guid tenantId,
        Guid assignmentId,
        string source,
        HostCoordinationDocumentDto document,
        CancellationToken cancellationToken)
    {
        var groupName = ApostolOsRealtimeGroups.ForResource(
            tenantId,
            "engagement",
            assignmentId);

        var notification = new EngagementDocumentAddedEvent(
            assignmentId,
            source,
            document,
            DateTimeOffset.UtcNow);

        return hub.Clients.Group(groupName).SendAsync(
            EngagementRealtimeEvents.DocumentAdded,
            notification,
            cancellationToken);
    }
}
