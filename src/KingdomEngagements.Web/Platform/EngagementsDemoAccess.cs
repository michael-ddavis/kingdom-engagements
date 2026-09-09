using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using KingdomEngagements.Web.Features;

namespace KingdomEngagements.Web.Platform;

public static class EngagementsDemoRoles
{
    public const string CookieName = "KingdomOS.EngagementsDemoRole";
    public const string HeaderName = "X-Kingdom-Engagements-Demo-Role";
    public const string RoleClaim = "kingdom:engagements-demo-role";
    public const string AssignedEngagementClaim = "kingdom:engagement-assignment";

    public const string Administrator = "administrator";
    public const string Coordinator = "coordinator";
    public const string Apostle = "apostle";
    public const string Minister = "minister";

    private static readonly string[] MinisterAssignments =
    [
        "assignment-demo-001",
        "assignment-demo-002",
        "assignment-demo-007"
    ];

    public static string Resolve(HttpRequest request)
    {
        var requested = request.Headers[HeaderName].FirstOrDefault()
            ?? request.Cookies[CookieName]
            ?? Administrator;
        return Normalize(requested);
    }

    public static string Normalize(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            Coordinator => Coordinator,
            Apostle => Apostle,
            Minister => Minister,
            _ => Administrator
        };

    public static ClaimsPrincipal CreateDevelopmentPrincipal(
        string organizationKey,
        Guid tenantId,
        string role)
    {
        role = Normalize(role);
        var claims = new List<Claim>
        {
            new(KingdomIdentity.TenantClaim, tenantId.ToString("D")),
            new(KingdomIdentity.DemoOrganizationClaim, organizationKey),
            new(RoleClaim, role),
        };

        switch (role)
        {
            case Coordinator:
                claims.AddRange(
                [
                    new Claim(ClaimTypes.NameIdentifier, "demo-engagements-coordinator"),
                    new Claim(ClaimTypes.Name, "Engagement Coordinator"),
                    new Claim(ClaimTypes.Email, "coordinator@kingdomos.local"),
                    new Claim(KingdomIdentity.TenantRoleClaim, "member"),
                    new Claim(KingdomIdentity.ProductRoleClaim, "engagements:coordinator"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:assignments:write"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:bookings:manage"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:financial:read"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:internal-notes:read"),
                    new Claim(ClaimTypes.Role, "Coordinator"),
                ]);
                break;

            case Apostle:
                claims.AddRange(
                [
                    new Claim(ClaimTypes.NameIdentifier, "demo-apostle-cynthia"),
                    new Claim(ClaimTypes.Name, "Cynthia Thompson"),
                    new Claim(ClaimTypes.Email, "cynthia@kingdomos.local"),
                    new Claim(KingdomIdentity.TenantRoleClaim, "member"),
                    new Claim(KingdomIdentity.ProductRoleClaim, "engagements:executive"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:assignments:read"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:bookings:read"),
                    new Claim(ClaimTypes.Role, "Executive"),
                ]);
                break;

            case Minister:
                claims.AddRange(
                [
                    new Claim(ClaimTypes.NameIdentifier, "demo-engagements-minister"),
                    new Claim(ClaimTypes.Name, "Cynthia Thompson"),
                    new Claim(ClaimTypes.Email, "minister@kingdomos.local"),
                    new Claim(KingdomIdentity.TenantRoleClaim, "member"),
                    new Claim(KingdomIdentity.ProductRoleClaim, "engagements:minister"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:assignments:read-assigned"),
                    new Claim(ClaimTypes.Role, "Minister"),
                ]);
                claims.AddRange(MinisterAssignments.Select(id => new Claim(AssignedEngagementClaim, id)));
                break;

            default:
                claims.AddRange(
                [
                    new Claim(ClaimTypes.NameIdentifier, "demo-engagements-admin"),
                    new Claim(ClaimTypes.Name, "Michael Davis"),
                    new Claim(ClaimTypes.Email, "michael@kingdomos.local"),
                    new Claim(KingdomIdentity.TenantRoleClaim, "owner"),
                    new Claim(KingdomIdentity.ProductRoleClaim, "engagements:administrator"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:assignments:write"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:bookings:manage"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:financial:read"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:internal-notes:read"),
                    new Claim(KingdomIdentity.PermissionClaim, "engagements:closeout:complete"),
                    new Claim(ClaimTypes.Role, "Administrator"),
                ]);
                break;
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, KingdomIdentity.Scheme));
    }

    public static string CurrentRole(ClaimsPrincipal principal) =>
        Normalize(principal.FindFirstValue(RoleClaim));

    public static bool IsMinister(ClaimsPrincipal principal) =>
        string.Equals(CurrentRole(principal), Minister, StringComparison.OrdinalIgnoreCase);

    public static bool IsApostle(ClaimsPrincipal principal) =>
        string.Equals(CurrentRole(principal), Apostle, StringComparison.OrdinalIgnoreCase);

    public static bool CanUseBookingDesk(ClaimsPrincipal principal)
    {
        var role = CurrentRole(principal);
        return role == Administrator || role == Coordinator || role == Apostle;
    }

    public static bool CanViewAllEngagements(ClaimsPrincipal principal)
    {
        var role = CurrentRole(principal);
        return role == Administrator || role == Coordinator || role == Apostle;
    }

    public static bool CanViewFinancials(ClaimsPrincipal principal) =>
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:financial:read");

    public static bool CanViewInternalNotes(ClaimsPrincipal principal) =>
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:internal-notes:read");

    public static bool CanCompleteEngagements(ClaimsPrincipal principal) =>
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:closeout:complete");

    public static IReadOnlySet<string> AssignedEngagements(ClaimsPrincipal principal) =>
        principal.FindAll(AssignedEngagementClaim)
            .Select(claim => claim.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static bool CanAccessAssignment(ClaimsPrincipal principal, EngagementSummary assignment) =>
        !IsMinister(principal) || AssignedEngagements(principal).Contains(assignment.ExternalAssignmentId);
}

public sealed class EngagementsDemoAccessMiddleware(
    RequestDelegate next,
    IWebHostEnvironment environment)
{
    private static readonly Regex AssignmentPath = new(
        "^/api/engagements/assignments/(?<id>[0-9a-fA-F-]{36})(?<rest>/.*)?$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public async Task InvokeAsync(
        HttpContext context,
        EngagementsService engagements)
    {
        if (!environment.IsDevelopment() || HttpMethods.IsOptions(context.Request.Method))
        {
            await next(context);
            return;
        }

        var path = context.Request.Path.Value ?? string.Empty;

        // Coordinators can maintain the closeout record, but only the executive/admin
        // persona may perform the irreversible demo completion action.
        if (!EngagementsDemoRoles.CanCompleteEngagements(context.User) &&
            HttpMethods.IsPut(context.Request.Method) &&
            path.EndsWith("/closeout", StringComparison.OrdinalIgnoreCase) &&
            await RequestsCompletionAsync(context.Request, context.RequestAborted))
        {
            await ForbidAsync(context, "Only the Administrator / Executive role can complete an engagement.");
            return;
        }

        if (!EngagementsDemoRoles.IsMinister(context.User))
        {
            await next(context);
            return;
        }

        if (path.StartsWith("/api/engagements/requests", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/engagements/global-bookings", StringComparison.OrdinalIgnoreCase))
        {
            await ForbidAsync(context, "Booking and invitation administration is not available to the assigned minister role.");
            return;
        }

        if (string.Equals(path, "/api/engagements/assignments", StringComparison.OrdinalIgnoreCase))
        {
            await ForbidAsync(context, "Use the assigned-engagement view for the minister role.");
            return;
        }

        var match = AssignmentPath.Match(path);
        if (!match.Success)
        {
            await next(context);
            return;
        }

        var rest = match.Groups["rest"].Value;
        if (string.IsNullOrEmpty(rest))
        {
            await ForbidAsync(context, "Use the assigned-engagement detail endpoint for the minister role.");
            return;
        }

        if (rest.StartsWith("/completion", StringComparison.OrdinalIgnoreCase) ||
            rest.StartsWith("/responses", StringComparison.OrdinalIgnoreCase) ||
            rest.StartsWith("/closeout", StringComparison.OrdinalIgnoreCase))
        {
            await ForbidAsync(context, "Ministry response, Care, and closeout records are restricted for the assigned minister role.");
            return;
        }

        if (!Guid.TryParse(match.Groups["id"].Value, out var assignmentId))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var assignment = await engagements.GetAsync(
            KingdomIdentity.TenantId(context.User, context.Request),
            assignmentId,
            context.RequestAborted);
        if (assignment is null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        if (!EngagementsDemoRoles.CanAccessAssignment(context.User, assignment.Summary))
        {
            await ForbidAsync(context, "That engagement is not assigned to the current minister persona.");
            return;
        }

        await next(context);
    }

    private static async Task<bool> RequestsCompletionAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        if (request.ContentLength is null or 0) return false;
        request.EnableBuffering();
        try
        {
            using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: cancellationToken);
            return document.RootElement.ValueKind == JsonValueKind.Object &&
                   document.RootElement.TryGetProperty("complete", out var complete) &&
                   complete.ValueKind == JsonValueKind.True;
        }
        catch (JsonException)
        {
            return false;
        }
        finally
        {
            request.Body.Position = 0;
        }
    }

    private static async Task ForbidAsync(HttpContext context, string message)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { message });
    }
}

public static class EngagementsDemoAccessEndpoints
{
    public static IEndpointRouteBuilder MapEngagementsDemoAccessEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements").RequireAuthorization();

        group.MapGet("/demo-persona", (HttpContext context) =>
        {
            var role = EngagementsDemoRoles.CurrentRole(context.User);
            return Results.Ok(new
            {
                role,
                name = context.User.Identity?.Name ?? "Engagements user",
                canViewAllEngagements = EngagementsDemoRoles.CanViewAllEngagements(context.User),
                canManageBookings = context.User.HasClaim(KingdomIdentity.PermissionClaim, "engagements:bookings:manage"),
                canManageAssignments = KingdomIdentity.CanWriteEngagements(context.User),
                canViewFinancials = EngagementsDemoRoles.CanViewFinancials(context.User),
                canViewInternalNotes = EngagementsDemoRoles.CanViewInternalNotes(context.User),
                canCompleteEngagements = EngagementsDemoRoles.CanCompleteEngagements(context.User),
                assignedEngagements = EngagementsDemoRoles.AssignedEngagements(context.User).ToArray(),
            });
        });

        group.MapGet("/my-assignments", async (
            HttpContext context,
            EngagementsService service,
            CancellationToken cancellationToken) =>
        {
            var all = await service.GetAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                cancellationToken);
            if (!EngagementsDemoRoles.IsMinister(context.User))
                return Results.Ok(all);

            var assigned = EngagementsDemoRoles.AssignedEngagements(context.User);
            return Results.Ok(all.Where(item => assigned.Contains(item.ExternalAssignmentId)).ToArray());
        });

        group.MapGet("/my-assignments/{id:guid}", async (
            Guid id,
            HttpContext context,
            EngagementsService service,
            CancellationToken cancellationToken) =>
        {
            var item = await service.GetAsync(
                KingdomIdentity.TenantId(context.User, context.Request),
                id,
                cancellationToken);
            if (item is null) return Results.NotFound();
            if (!EngagementsDemoRoles.CanAccessAssignment(context.User, item.Summary))
                return Results.Forbid();

            return Results.Ok(EngagementsDemoRoles.IsMinister(context.User)
                ? item with { Notes = null }
                : item);
        });

        group.MapPost("/assignments/{id:guid}/archive", async (
            Guid id,
            HttpContext context,
            EngagementsService service,
            CancellationToken cancellationToken) =>
        {
            if (!EngagementsDemoRoles.CanCompleteEngagements(context.User))
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
