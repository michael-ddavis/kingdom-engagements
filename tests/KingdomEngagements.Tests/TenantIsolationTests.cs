using System.Security.Claims;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace KingdomEngagements.Tests;

public sealed class TenantIsolationTests
{
    [Fact]
    public async Task InMemory_filters_direct_and_navigation_scoped_entities()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenant = new TestTenantAccessor();

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-isolation-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options, tenant);

        using (tenant.BeginCrossTenantBypass("Seed two tenants for isolation regression coverage."))
        {
            database.Assignments.AddRange(
                Assignment(tenantA, "tenant-a"),
                Assignment(tenantB, "tenant-b"));
            await database.SaveChangesAsync();
        }

        database.ChangeTracker.Clear();

        using (tenant.BeginTenantScope(tenantA, "Read only tenant A."))
        {
            var assignments = await database.Assignments
                .AsNoTracking()
                .Select(x => x.ExternalAssignmentId)
                .ToArrayAsync();

            var tasks = await database.Tasks
                .AsNoTracking()
                .Select(x => x.Title)
                .ToArrayAsync();

            Assert.Equal(["tenant-a"], assignments);
            Assert.Equal(["task-tenant-a"], tasks);
        }
    }

    [Fact]
    public void Every_tenant_scoped_context_has_query_filters()
    {
        var tenant = new TestTenantAccessor(Guid.NewGuid());

        using var engagements = new EngagementsDbContext(
            new DbContextOptionsBuilder<EngagementsDbContext>()
                .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
                .UseInMemoryDatabase($"filters-engagements-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var requests = new SpeakingRequestsDbContext(
            new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
                .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
                .UseInMemoryDatabase($"filters-requests-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var bookings = new GlobalBookingDbContext(
            new DbContextOptionsBuilder<GlobalBookingDbContext>()
                .UseInMemoryDatabase($"filters-bookings-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var preparations = new EngagementPreparationDbContext(
            new DbContextOptionsBuilder<EngagementPreparationDbContext>()
                .UseInMemoryDatabase($"filters-preparations-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var hostAccess = new HostAccessDbContext(
            new DbContextOptionsBuilder<HostAccessDbContext>()
                .UseInMemoryDatabase($"filters-host-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var workspace = new AssignmentWorkspaceDbContext(
            new DbContextOptionsBuilder<AssignmentWorkspaceDbContext>()
                .UseInMemoryDatabase($"filters-workspace-{Guid.NewGuid():N}")
                .Options,
            tenant);

        using var completion = new EngagementCompletionDbContext(
            new DbContextOptionsBuilder<EngagementCompletionDbContext>()
                .UseInMemoryDatabase($"filters-completion-{Guid.NewGuid():N}")
                .Options,
            tenant);

        AssertFilter<EngagementAssignment>(engagements);
        AssertFilter<EngagementTask>(engagements);
        AssertFilter<EngagementDocument>(engagements);
        AssertFilter<StandingResponsibilityAssignment>(engagements);
        AssertFilter<EngagementResponsibilityOverride>(engagements);
        AssertFilter<EngagementLaneProgress>(engagements);
        AssertFilter<EngagementMediaAsset>(engagements);
        AssertFilter<EngagementTeamMember>(engagements);

        AssertFilter<SpeakingRequestRecord>(requests);
        AssertFilter<SpeakingRequestCommunicationRecord>(requests);
        AssertFilter<GlobalBookingRecord>(bookings);

        AssertFilter<EngagementPreparationRecord>(preparations);
        AssertFilter<HostCoordinationDocumentRecord>(preparations);
        AssertFilter<HostCoordinationMessageRecord>(preparations);

        AssertFilter<HostAccessInvitationRecord>(hostAccess);
        AssertFilter<AssignmentWorkspaceActivityRecord>(workspace);
        AssertFilter<MinistryResponseRecord>(completion);
        AssertFilter<EngagementCloseoutRecord>(completion);
    }

    [Fact]
    public void Current_tenant_accessor_resolves_host_scheme_and_rejects_conflicts()
    {
        var hostTenant = Guid.NewGuid();
        var http = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = Principal(
                    new Claim(HostAccessIdentity.TenantIdClaim, hostTenant.ToString()))
            }
        };

        var accessor = new CurrentTenantAccessor(
            http,
            NullLogger<CurrentTenantAccessor>.Instance);

        Assert.Equal(hostTenant, accessor.TenantId);

        http.HttpContext!.User = Principal(
            new Claim(KingdomIdentity.TenantClaim, Guid.NewGuid().ToString()),
            new Claim(HostAccessIdentity.TenantIdClaim, hostTenant.ToString()));

        Assert.Throws<UnauthorizedAccessException>(() => _ = accessor.TenantId);
    }

    [Fact]
    public async Task Tenant_scoped_write_rejects_wrong_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenant = new TestTenantAccessor(tenantA);

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-write-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options, tenant);
        database.Assignments.Add(Assignment(tenantB, "wrong-tenant"));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => database.SaveChangesAsync());
    }

    private static EngagementAssignment Assignment(Guid tenantId, string externalId)
    {
        var now = DateTimeOffset.UtcNow;
        var assignment = new EngagementAssignment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ExternalAssignmentId = externalId,
            Title = externalId,
            SpeakerName = "Speaker",
            HostOrganization = "Host",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(),
            Title = $"task-{externalId}",
            Category = "host",
            Owner = "Coordinator",
            UpdatedAtUtc = now
        });

        return assignment;
    }

    private static ClaimsPrincipal Principal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, "test"));

    private static void AssertFilter<TEntity>(DbContext database)
        where TEntity : class
    {
        Assert.NotNull(database.Model.FindEntityType(typeof(TEntity))?.GetQueryFilter());
    }
}
