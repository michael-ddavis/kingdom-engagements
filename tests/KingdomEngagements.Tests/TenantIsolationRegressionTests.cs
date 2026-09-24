using System.Security.Claims;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace KingdomEngagements.Tests;

public sealed class TenantIsolationRegressionTests
{
    [Fact]
    public async Task Current_tenant_filter_blocks_other_tenant_roots_and_navigation_children()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var services = new ServiceCollection();
        services.AddHttpContextAccessor();
        services.AddDbContext<EngagementsDbContext>(options =>
            options.UseInMemoryDatabase($"tenant-isolation-{Guid.NewGuid():N}"));

        await using var provider = services.BuildServiceProvider();

        var httpContextAccessor = provider.GetRequiredService<IHttpContextAccessor>();
        httpContextAccessor.HttpContext = new DefaultHttpContext
        {
            User = PrincipalForTenant(tenantA)
        };

        await using var scope = provider.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();

        var assignmentA = Assignment(tenantA, "tenant-a");
        assignmentA.Tasks.Add(Task("Tenant A task"));

        var assignmentB = Assignment(tenantB, "tenant-b");
        assignmentB.Tasks.Add(Task("Tenant B task"));

        database.Assignments.AddRange(assignmentA, assignmentB);
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();

        var assignments = await database.Assignments
            .AsNoTracking()
            .OrderBy(x => x.ExternalAssignmentId)
            .ToListAsync();

        var tasks = await database.Tasks
            .AsNoTracking()
            .Include(x => x.Assignment)
            .OrderBy(x => x.Title)
            .ToListAsync();

        Assert.Single(assignments);
        Assert.Equal(tenantA, assignments[0].TenantId);

        Assert.Single(tasks);
        Assert.NotNull(tasks[0].Assignment);
        Assert.Equal(tenantA, tasks[0].Assignment!.TenantId);
        Assert.Equal("Tenant A task", tasks[0].Title);
    }

    private static ClaimsPrincipal PrincipalForTenant(Guid tenantId)
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "tenant-isolation-test"),
            new Claim(KingdomIdentity.TenantClaim, tenantId.ToString())
        ],
        KingdomIdentity.Scheme);

        return new ClaimsPrincipal(identity);
    }

    private static EngagementAssignment Assignment(Guid tenantId, string externalId)
    {
        var now = DateTimeOffset.UtcNow;

        return new EngagementAssignment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ExternalAssignmentId = externalId,
            Title = externalId,
            SpeakerName = "Speaker",
            HostOrganization = "Host",
            Status = "planning",
            TravelStatus = "not-started",
            LodgingStatus = "not-started",
            TransportationStatus = "not-started",
            HostStatus = "not-started",
            DocumentsStatus = "not-started",
            CloseoutStatus = "not-started",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    private static EngagementTask Task(string title) =>
        new()
        {
            Id = Guid.NewGuid(),
            Category = "host",
            Title = title,
            Owner = "Owner",
            Status = "open",
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
}
