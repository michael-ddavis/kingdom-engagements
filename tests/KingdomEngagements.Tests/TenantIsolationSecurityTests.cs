using System.Security.Claims;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace KingdomEngagements.Tests;

public sealed class TenantIsolationSecurityTests
{
    [Fact]
    public async Task Raw_assignment_and_navigation_queries_only_return_current_tenant_rows()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenantAccessor = new TestCurrentTenantAccessor();

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-isolation-green-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options, tenantAccessor);
        var now = DateTimeOffset.UtcNow;

        using (tenantAccessor.BeginTenant(tenantA, "seed tenant A"))
        {
            var assignment = Assignment(tenantA, "tenant-a", now);
            assignment.Tasks.Add(Task("tenant-a-task", now));
            database.Assignments.Add(assignment);
            await database.SaveChangesAsync();
            database.ChangeTracker.Clear();
        }

        using (tenantAccessor.BeginTenant(tenantB, "seed tenant B"))
        {
            var assignment = Assignment(tenantB, "tenant-b", now);
            assignment.Tasks.Add(Task("tenant-b-task", now));
            database.Assignments.Add(assignment);
            await database.SaveChangesAsync();
            database.ChangeTracker.Clear();
        }

        using (tenantAccessor.BeginTenant(tenantA, "query tenant A"))
        {
            var visibleAssignments = await database.Assignments
                .AsNoTracking()
                .ToListAsync();
            var visibleTasks = await database.Tasks
                .AsNoTracking()
                .ToListAsync();

            var assignment = Assert.Single(visibleAssignments);
            Assert.Equal(tenantA, assignment.TenantId);

            var task = Assert.Single(visibleTasks);
            Assert.Equal("tenant-a-task", task.Title);
        }
    }

    [Fact]
    public async Task Tenant_scoped_write_cannot_target_another_tenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenantAccessor = new TestCurrentTenantAccessor();

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-write-guard-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options, tenantAccessor);

        using var tenantScope = tenantAccessor.BeginTenant(tenantA, "cross-tenant write test");
        database.Assignments.Add(Assignment(tenantB, "wrong-tenant", DateTimeOffset.UtcNow));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => database.SaveChangesAsync());

        Assert.Contains("current tenant", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Explicit_bypass_can_read_across_tenants_but_cannot_save()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tenantAccessor = new TestCurrentTenantAccessor();

        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"tenant-bypass-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(options, tenantAccessor);

        using (tenantAccessor.BeginTenant(tenantA, "seed tenant A"))
        {
            database.Assignments.Add(Assignment(tenantA, "a", DateTimeOffset.UtcNow));
            await database.SaveChangesAsync();
            database.ChangeTracker.Clear();
        }

        using (tenantAccessor.BeginTenant(tenantB, "seed tenant B"))
        {
            database.Assignments.Add(Assignment(tenantB, "b", DateTimeOffset.UtcNow));
            await database.SaveChangesAsync();
            database.ChangeTracker.Clear();
        }

        using var bypass = tenantAccessor.BeginFilterBypass("security test cross-tenant read");
        Assert.Equal(2, await database.Assignments.AsNoTracking().CountAsync());

        database.Assignments.Add(Assignment(tenantA, "blocked-save", DateTimeOffset.UtcNow));
        await Assert.ThrowsAsync<InvalidOperationException>(() => database.SaveChangesAsync());
    }

    [Fact]
    public void Current_tenant_accessor_supports_internal_and_host_authentication_claims()
    {
        var internalTenant = Guid.NewGuid();
        var hostTenant = Guid.NewGuid();

        var http = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = Principal(KingdomIdentity.TenantClaim, internalTenant)
            }
        };

        var accessor = new CurrentTenantAccessor(
            http,
            NullLogger<CurrentTenantAccessor>.Instance);

        Assert.Equal(internalTenant, accessor.TenantId);

        http.HttpContext.User = Principal(HostAccessIdentity.TenantIdClaim, hostTenant);
        Assert.Equal(hostTenant, accessor.TenantId);
    }

    [Fact]
    public void Every_tenant_scoped_entity_in_all_seven_contexts_has_a_global_query_filter()
    {
        var tenantAccessor = new TestCurrentTenantAccessor();

        using var engagements = new EngagementsDbContext(
            new DbContextOptionsBuilder<EngagementsDbContext>()
                .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
                .UseInMemoryDatabase($"filters-engagements-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var requests = new SpeakingRequestsDbContext(
            new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
                .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
                .UseInMemoryDatabase($"filters-requests-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var bookings = new GlobalBookingDbContext(
            new DbContextOptionsBuilder<GlobalBookingDbContext>()
                .UseInMemoryDatabase($"filters-bookings-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var preparations = new EngagementPreparationDbContext(
            new DbContextOptionsBuilder<EngagementPreparationDbContext>()
                .UseInMemoryDatabase($"filters-preparations-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var hostAccess = new HostAccessDbContext(
            new DbContextOptionsBuilder<HostAccessDbContext>()
                .UseInMemoryDatabase($"filters-host-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var workspace = new AssignmentWorkspaceDbContext(
            new DbContextOptionsBuilder<AssignmentWorkspaceDbContext>()
                .UseInMemoryDatabase($"filters-workspace-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        using var completion = new EngagementCompletionDbContext(
            new DbContextOptionsBuilder<EngagementCompletionDbContext>()
                .UseInMemoryDatabase($"filters-completion-{Guid.NewGuid():N}")
                .Options,
            tenantAccessor);

        AssertFilters(
            engagements,
            typeof(EngagementAssignment),
            typeof(EngagementTask),
            typeof(EngagementDocument),
            typeof(StandingResponsibilityAssignment),
            typeof(EngagementResponsibilityOverride),
            typeof(EngagementLaneProgress),
            typeof(EngagementMediaAsset),
            typeof(EngagementTeamMember));

        AssertFilters(
            requests,
            typeof(SpeakingRequestRecord),
            typeof(SpeakingRequestCommunicationRecord));

        AssertFilters(bookings, typeof(GlobalBookingRecord));

        AssertFilters(
            preparations,
            typeof(EngagementPreparationRecord),
            typeof(HostCoordinationDocumentRecord),
            typeof(HostCoordinationMessageRecord));

        AssertFilters(hostAccess, typeof(HostAccessInvitationRecord));
        AssertFilters(workspace, typeof(AssignmentWorkspaceActivityRecord));

        AssertFilters(
            completion,
            typeof(MinistryResponseRecord),
            typeof(EngagementCloseoutRecord));
    }

    private static void AssertFilters(DbContext database, params Type[] entityTypes)
    {
        foreach (var entityType in entityTypes)
        {
            var mapped = database.Model.FindEntityType(entityType);
            Assert.NotNull(mapped);
            Assert.NotNull(mapped.GetQueryFilter());
        }
    }

    private static ClaimsPrincipal Principal(string claimType, Guid tenantId) =>
        new(new ClaimsIdentity(
            [new Claim(claimType, tenantId.ToString())],
            "test"));

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
        HostOrganization = "Security test host",
        Status = "planning",
        CreatedAtUtc = now,
        UpdatedAtUtc = now
    };

    private static EngagementTask Task(string title, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Category = "host",
        Title = title,
        Owner = "Security test",
        Status = "open",
        UpdatedAtUtc = now
    };
}
