using System.Security.Claims;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace KingdomEngagements.Tests;

public sealed class TenantIsolationTests
{
    [Fact]
    public async Task Engagement_queries_only_return_the_current_tenant_including_navigation_children()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var currentTenant = TestTenants.For(tenantA);
        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .UseInMemoryDatabase($"tenant-isolation-{Guid.NewGuid():N}")
            .Options;

        await using var database = new EngagementsDbContext(currentTenant, options);
        var assignmentA = Assignment(tenantA, "tenant-a");
        var assignmentB = Assignment(tenantB, "tenant-b");
        assignmentA.Tasks.Add(Task("task-a"));
        assignmentB.Tasks.Add(Task("task-b"));
        database.Assignments.AddRange(assignmentA, assignmentB);
        await database.SaveChangesAsync();

        var visibleAssignments = await database.Assignments.AsNoTracking().ToListAsync();
        var visibleTasks = await database.Tasks.AsNoTracking().ToListAsync();

        Assert.Single(visibleAssignments);
        Assert.Equal(tenantA, visibleAssignments[0].TenantId);
        Assert.Single(visibleTasks);
        Assert.Equal("task-a", visibleTasks[0].Title);

        using (currentTenant.UseTenant(tenantB))
        {
            visibleAssignments = await database.Assignments.AsNoTracking().ToListAsync();
            visibleTasks = await database.Tasks.AsNoTracking().ToListAsync();

            Assert.Single(visibleAssignments);
            Assert.Equal(tenantB, visibleAssignments[0].TenantId);
            Assert.Single(visibleTasks);
            Assert.Equal("task-b", visibleTasks[0].Title);
        }
    }

    [Fact]
    public void Every_tenant_scoped_context_has_query_filters()
    {
        var tenant = TestTenants.For(Guid.NewGuid());

        using var engagements = new EngagementsDbContext(
            tenant,
            new DbContextOptionsBuilder<EngagementsDbContext>()
                .UseInMemoryDatabase($"engagements-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<EngagementAssignment>(engagements.Model);
        AssertFiltered<EngagementTask>(engagements.Model);
        AssertFiltered<EngagementDocument>(engagements.Model);
        AssertFiltered<StandingResponsibilityAssignment>(engagements.Model);
        AssertFiltered<EngagementResponsibilityOverride>(engagements.Model);
        AssertFiltered<EngagementLaneProgress>(engagements.Model);
        AssertFiltered<EngagementMediaAsset>(engagements.Model);
        AssertFiltered<EngagementTeamMember>(engagements.Model);

        using var requests = new SpeakingRequestsDbContext(
            tenant,
            new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
                .UseInMemoryDatabase($"requests-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<SpeakingRequestRecord>(requests.Model);
        AssertFiltered<SpeakingRequestCommunicationRecord>(requests.Model);

        using var bookings = new GlobalBookingDbContext(
            tenant,
            new DbContextOptionsBuilder<GlobalBookingDbContext>()
                .UseInMemoryDatabase($"bookings-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<GlobalBookingRecord>(bookings.Model);

        using var preparation = new EngagementPreparationDbContext(
            tenant,
            new DbContextOptionsBuilder<EngagementPreparationDbContext>()
                .UseInMemoryDatabase($"preparation-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<EngagementPreparationRecord>(preparation.Model);
        AssertFiltered<HostCoordinationDocumentRecord>(preparation.Model);
        AssertFiltered<HostCoordinationMessageRecord>(preparation.Model);

        using var hostAccess = new HostAccessDbContext(
            tenant,
            new DbContextOptionsBuilder<HostAccessDbContext>()
                .UseInMemoryDatabase($"host-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<HostAccessInvitationRecord>(hostAccess.Model);

        using var workspace = new AssignmentWorkspaceDbContext(
            tenant,
            new DbContextOptionsBuilder<AssignmentWorkspaceDbContext>()
                .UseInMemoryDatabase($"workspace-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<AssignmentWorkspaceActivityRecord>(workspace.Model);

        using var completion = new EngagementCompletionDbContext(
            tenant,
            new DbContextOptionsBuilder<EngagementCompletionDbContext>()
                .UseInMemoryDatabase($"completion-filter-{Guid.NewGuid():N}")
                .Options);
        AssertFiltered<MinistryResponseRecord>(completion.Model);
        AssertFiltered<EngagementCloseoutRecord>(completion.Model);
    }

    [Fact]
    public void Sql_server_query_contains_tenant_predicate_for_navigation_scoped_children()
    {
        var currentTenant = TestTenants.For(Guid.NewGuid());
        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .UseSqlServer("Server=localhost;Database=tenant-isolation;User Id=sa;Password=not-used;TrustServerCertificate=True")
            .Options;

        using var database = new EngagementsDbContext(currentTenant, options);
        var sql = database.Tasks.AsNoTracking().ToQueryString();

        Assert.Contains("TenantId", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Request_headers_cannot_select_a_tenant()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Kingdom-Tenant"] = Guid.NewGuid().ToString("D");
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "user-without-tenant")],
            KingdomIdentity.Scheme));

        Assert.Throws<UnauthorizedAccessException>(
            () => KingdomIdentity.TenantId(principal, context.Request));
    }

    private static void AssertFiltered<TEntity>(IModel model) where TEntity : class =>
        Assert.NotNull(model.FindEntityType(typeof(TEntity))?.GetQueryFilter());

    private static EngagementAssignment Assignment(Guid tenantId, string externalId) => new()
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
        CreatedAtUtc = DateTimeOffset.UtcNow,
        UpdatedAtUtc = DateTimeOffset.UtcNow
    };

    private static EngagementTask Task(string title) => new()
    {
        Id = Guid.NewGuid(),
        Category = "test",
        Title = title,
        Owner = "Test",
        Status = "open",
        UpdatedAtUtc = DateTimeOffset.UtcNow
    };
}
