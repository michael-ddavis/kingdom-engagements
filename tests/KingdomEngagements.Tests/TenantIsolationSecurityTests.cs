using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class TenantIsolationSecurityTests
{
    [Fact]
    public async Task Raw_assignment_query_must_not_return_another_tenants_rows()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-isolation-red-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options);

        var now = DateTimeOffset.UtcNow;
        database.Assignments.AddRange(
            Assignment(tenantA, "tenant-a", now),
            Assignment(tenantB, "tenant-b", now));

        await database.SaveChangesAsync();

        var visibleAssignments = await database.Assignments
            .AsNoTracking()
            .ToListAsync();

        Assert.Single(visibleAssignments);
        Assert.Equal(tenantA, visibleAssignments[0].TenantId);
    }

    private static EngagementAssignment Assignment(
        Guid tenantId,
        string externalId,
        DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        ExternalAssignmentId = externalId,
        Title = $"Assignment {externalId}",
        SpeakerName = "Security test speaker",
        Status = "planning",
        CreatedAtUtc = now,
        UpdatedAtUtc = now
    };
}
