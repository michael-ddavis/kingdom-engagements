using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using KingdomEngagements.Web.Features;

namespace KingdomEngagements.Web.Platform;

public static class EngagementAccessEndpoints
{
    public static IEndpointRouteBuilder MapEngagementAccessEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements").RequireAuthorization("EngagementsAccess");

        group.MapGet("/session", (HttpContext context) =>
        {
            if (!KingdomIdentity.HasEngagementsAccess(context.User))
                return Results.Forbid();

            var role = EngagementAccessRoles.CurrentRole(context.User);
            return Results.Ok(new
            {
                role,
                name = context.User.Identity?.Name ?? "Engagements user",
                subject = KingdomIdentity.Subject(context.User, context.Request),
                tenantId = KingdomIdentity.TenantId(context.User, context.Request),
                canViewAllEngagements = EngagementAccessRoles.CanViewAllEngagements(context.User),
                canManageBookings = EngagementAccessRoles.CanUseBookingDesk(context.User),
                canManageAssignments = KingdomIdentity.CanWriteEngagements(context.User),
                canDirectEngagements = KingdomIdentity.CanDirectEngagements(context.User),
                canViewFinancials = EngagementAccessRoles.CanViewFinancials(context.User),
                canViewInternalNotes = EngagementAccessRoles.CanViewInternalNotes(context.User),
                canCompleteEngagements = EngagementAccessRoles.CanCompleteEngagements(context.User)
            });
        });



        group.MapGet("/my-assignments", async (
            HttpContext context,
            EngagementsService service,
            EngagementResponsibilityService responsibilities,
            CancellationToken cancellationToken) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var all = await service.GetAsync(tenantId, cancellationToken);

            if (KingdomIdentity.CanViewAllEngagements(context.User))
                return Results.Ok(all);

            var myWork = await responsibilities.GetMyWorkAsync(
                tenantId,
                KingdomIdentity.Subject(context.User, context.Request),
                cancellationToken);
            var ownedAssignmentIds = myWork
                .Select(item => item.Assignment.Id)
                .ToHashSet();

#if ENGAGEMENTS_DEMO
            // Preserve the original local demo minister while real users are driven by
            // standing responsibility ownership.
            if (context.User.HasClaim(EngagementsDemoRoles.RoleClaim, EngagementsDemoRoles.Minister) &&
                EngagementsDemoRoles.IsMinister(context.User))
            {
                var legacyAssigned = EngagementsDemoRoles.AssignedEngagements(context.User);
                return Results.Ok(all.Where(item =>
                    ownedAssignmentIds.Contains(item.Id) ||
                    legacyAssigned.Contains(item.ExternalAssignmentId)).ToArray());
            }
#endif

            return Results.Ok(all.Where(item => ownedAssignmentIds.Contains(item.Id)).ToArray());
        });

        group.MapGet("/my-assignments/{id:guid}", async (
            Guid id,
            HttpContext context,
            EngagementsService service,
            EngagementResponsibilityService responsibilities,
            CancellationToken cancellationToken) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var item = await service.GetAsync(tenantId, id, cancellationToken);
            if (item is null) return Results.NotFound();

            if (KingdomIdentity.CanDirectEngagements(context.User))
                return Results.Ok(item);

            if (KingdomIdentity.CanViewAllEngagements(context.User))
            {
                return Results.Ok(item with
                {
                    Notes = null,
                    Tasks = Array.Empty<EngagementTask>(),
                    Documents = Array.Empty<EngagementDocument>()
                });
            }

            var ownedLanes = await responsibilities.GetOwnedLaneKeysAsync(
                tenantId,
                id,
                KingdomIdentity.Subject(context.User, context.Request),
                cancellationToken);

            if (ownedLanes.Count > 0)
            {
                var tasks = item.Tasks
                    .Where(task => ownedLanes.Contains(
                        EngagementResponsibilityLanes.Normalize(task.Category)))
                    .ToArray();
                var documents = item.Documents
                    .Where(document =>
                        ownedLanes.Contains("documents") ||
                        ownedLanes.Contains(EngagementResponsibilityLanes.Normalize(document.Category)) ||
                        (ownedLanes.Contains("finance") &&
                         string.Equals(document.Category, "agreement", StringComparison.OrdinalIgnoreCase)))
                    .ToArray();

                return Results.Ok(item with
                {
                    Notes = null,
                    Tasks = tasks,
                    Documents = documents
                });
            }

#if ENGAGEMENTS_DEMO
            if (context.User.HasClaim(EngagementsDemoRoles.RoleClaim, EngagementsDemoRoles.Minister) &&
                EngagementsDemoRoles.IsMinister(context.User) &&
                EngagementsDemoRoles.AssignedEngagements(context.User)
                    .Contains(item.Summary.ExternalAssignmentId))
            {
                return Results.Ok(item with { Notes = null });
            }
#endif

            return Results.Forbid();
        });

        group.MapPost("/assignments/{id:guid}/archive", async (
            Guid id,
            HttpContext context,
            EngagementsService service,
            CancellationToken cancellationToken) =>
        {
            if (!EngagementAccessRoles.CanCompleteEngagements(context.User))
                return Results.Forbid();

            var item = await service.GetAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                cancellationToken);
            if (item is null) return Results.NotFound();
            if (!string.Equals(item.Summary.Status, "complete", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(item.Summary.Status, "archived", StringComparison.OrdinalIgnoreCase))
                return Results.Conflict(new { message = "Complete the engagement before archiving it." });

            var updated = await service.UpdateAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                new UpdateEngagementRequest(
                    item.Summary.Title,
                    item.Summary.SpeakerName,
                    item.Summary.HostOrganization,
                    item.HostContactName,
                    item.HostContactEmail,
                    item.Summary.Location,
                    item.Summary.StartsAtUtc,
                    item.EndsAtUtc,
                    "archived",
                    item.Summary.TravelStatus,
                    item.Summary.LodgingStatus,
                    item.Summary.TransportationStatus,
                    item.Summary.HostStatus,
                    item.Summary.DocumentsStatus,
                    item.Summary.CloseoutStatus,
                    item.Notes),
                cancellationToken);

            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        return endpoints;
    }
}
