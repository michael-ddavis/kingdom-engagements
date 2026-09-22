using System.Net.Http.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed record EngagementDirectoryPerson(
    Guid AccountId,
    string DisplayName);

public sealed class EngagementTeamMember
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AccountId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string AddedBySubject { get; set; } = string.Empty;
    public string AddedByName { get; set; } = string.Empty;
    public DateTimeOffset AddedAtUtc { get; set; }
}

public sealed record AddEngagementTeamMemberRequest(Guid AccountId);

public sealed class EngagementTeamService(
    EngagementsDbContext database,
    HttpClient httpClient,
    IConfiguration configuration)
{
    public async Task<IReadOnlyList<EngagementDirectoryPerson>> GetDirectoryAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var platformUrl = configuration["KingdomOS:PlatformInternalUrl"];
        if (string.IsNullOrWhiteSpace(platformUrl))
            return [];

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{platformUrl.TrimEnd('/')}/api/integration/identity/people");
        request.Headers.TryAddWithoutValidation("X-Kingdom-Tenant", tenantId.ToString("D"));
        request.Headers.TryAddWithoutValidation(
            "X-Kingdom-Service-Key",
            configuration["KingdomOS:Integration:ServiceKey"] ?? "local-kingdomos-integration");

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return [];

            var people = await response.Content.ReadFromJsonAsync<PlatformDirectoryEntry[]>(
                cancellationToken: cancellationToken) ?? [];

            return people
                .Where(person => string.Equals(person.Status, "active", StringComparison.OrdinalIgnoreCase))
                .OrderBy(person => person.DisplayName)
                .Select(person => new EngagementDirectoryPerson(person.Id, person.DisplayName))
                .ToArray();
        }
        catch (HttpRequestException)
        {
            return [];
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return [];
        }
    }

    public async Task<IReadOnlyList<EngagementTeamMember>> GetTeamAsync(
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await database.TeamMembers
            .AsNoTracking()
            .Where(member => member.TenantId == tenantId && member.IsActive)
            .OrderBy(member => member.DisplayName)
            .ToListAsync(cancellationToken);

    public async Task<EngagementTeamMember> AddAsync(
        Guid tenantId,
        AddEngagementTeamMemberRequest request,
        string actorSubject,
        string actorName,
        CancellationToken cancellationToken)
    {
        var directory = await GetDirectoryAsync(tenantId, cancellationToken);
        var person = directory.SingleOrDefault(item => item.AccountId == request.AccountId)
            ?? throw new ArgumentException("The selected ApostolOS account was not found in this organization.");

        var existing = await database.TeamMembers.SingleOrDefaultAsync(
            member => member.TenantId == tenantId && member.AccountId == person.AccountId,
            cancellationToken);

        if (existing is not null)
        {
            existing.DisplayName = person.DisplayName;
            existing.IsActive = true;
            existing.AddedBySubject = actorSubject;
            existing.AddedByName = actorName;
            existing.AddedAtUtc = DateTimeOffset.UtcNow;
            await database.SaveChangesAsync(cancellationToken);
            return existing;
        }

        var member = new EngagementTeamMember
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AccountId = person.AccountId,
            DisplayName = person.DisplayName,
            IsActive = true,
            AddedBySubject = actorSubject,
            AddedByName = actorName,
            AddedAtUtc = DateTimeOffset.UtcNow
        };

        database.TeamMembers.Add(member);
        await database.SaveChangesAsync(cancellationToken);
        return member;
    }

    public async Task<bool> RemoveAsync(
        Guid tenantId,
        Guid accountId,
        CancellationToken cancellationToken)
    {
        var member = await database.TeamMembers.SingleOrDefaultAsync(
            item => item.TenantId == tenantId && item.AccountId == accountId && item.IsActive,
            cancellationToken);
        if (member is null) return false;

        var subject = accountId.ToString("D");
        var hasStandingResponsibilities = await database.StandingResponsibilityAssignments
            .AsNoTracking()
            .AnyAsync(item =>
                item.TenantId == tenantId &&
                item.IsActive &&
                item.UserSubject == subject,
                cancellationToken);

        if (hasStandingResponsibilities)
            throw new InvalidOperationException(
                "Clear this team member's standing responsibilities before removing them from the Engagements team.");

        member.IsActive = false;
        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    private sealed record PlatformDirectoryEntry(
        Guid Id,
        string DisplayName,
        string Status);
}

public static class EngagementTeamEndpoints
{
    public static IEndpointRouteBuilder MapEngagementTeamEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements/team")
            .RequireAuthorization("EngagementsDirect");

        group.MapGet("/directory", async (
            HttpContext context,
            EngagementTeamService service,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var people = await service.GetDirectoryAsync(tenantId, ct);
            return Results.Ok(people);
        });

        group.MapGet("/", async (
            HttpContext context,
            EngagementTeamService service,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            return Results.Ok(await service.GetTeamAsync(tenantId, ct));
        });

        group.MapPost("/", async (
            AddEngagementTeamMemberRequest request,
            HttpContext context,
            EngagementTeamService service,
            CancellationToken ct) =>
        {
            try
            {
                var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
                var member = await service.AddAsync(
                    tenantId,
                    request,
                    KingdomIdentity.Subject(context.User, context.Request),
                    context.User.Identity?.Name ?? "Engagement Director",
                    ct);
                return Results.Ok(member);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(
                    new Dictionary<string, string[]> { ["teamMember"] = [exception.Message] });
            }
        });

        group.MapDelete("/{accountId:guid}", async (
            Guid accountId,
            HttpContext context,
            EngagementTeamService service,
            CancellationToken ct) =>
        {
            try
            {
                var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
                var removed = await service.RemoveAsync(tenantId, accountId, ct);
                return removed ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        return endpoints;
    }
}
