using System.Text.Json;
using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Tests;

public sealed class EngagementsServiceTests
{
    [Fact]
    public async Task AssignmentApprovedIntakeIsIdempotent()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        var envelope = ApprovedAssignment(
            eventId,
            tenantId,
            "assignment-100",
            "Regional Leadership Gathering");

        var first = await fixture.Service.IngestAsync(envelope, CancellationToken.None);
        fixture.Database.ChangeTracker.Clear();
        var second = await fixture.Service.IngestAsync(envelope, CancellationToken.None);

        Assert.False(first.Duplicate);
        Assert.True(second.Duplicate);
        Assert.Equal(first.AssignmentId, second.AssignmentId);
        Assert.Single(await fixture.Database.Assignments.ToListAsync());
        Assert.Single(await fixture.Database.IntegrationReceipts.ToListAsync());

        var assignment = await fixture.Database.Assignments
            .Include(item => item.Tasks)
            .SingleAsync();
        Assert.Equal("assignment-100", assignment.ExternalAssignmentId);
        Assert.Equal("Regional Leadership Gathering", assignment.Title);
        Assert.Contains(assignment.Tasks, task => task.Category == "host");
        Assert.Contains(assignment.Tasks, task => task.Category == "travel");
    }

    [Fact]
    public async Task AssignmentQueriesAreTenantIsolated()
    {
        await using var fixture = CreateFixture();
        var firstTenant = Guid.NewGuid();
        var secondTenant = Guid.NewGuid();

        await fixture.Service.CreateAsync(
            firstTenant,
            new CreateEngagementRequest(
                "assignment-first",
                "First Tenant Event",
                "Speaker One",
                "Host One",
                DateTimeOffset.UtcNow.AddDays(10),
                DateTimeOffset.UtcNow.AddDays(11),
                "Atlanta"),
            CancellationToken.None);
        fixture.Database.ChangeTracker.Clear();
        await fixture.Service.CreateAsync(
            secondTenant,
            new CreateEngagementRequest(
                "assignment-second",
                "Second Tenant Event",
                "Speaker Two",
                "Host Two",
                DateTimeOffset.UtcNow.AddDays(20),
                DateTimeOffset.UtcNow.AddDays(21),
                "Chicago"),
            CancellationToken.None);
        fixture.Database.ChangeTracker.Clear();

        var firstResults = await fixture.Service.GetAsync(firstTenant, CancellationToken.None);
        var secondResults = await fixture.Service.GetAsync(secondTenant, CancellationToken.None);

        var first = Assert.Single(firstResults);
        var second = Assert.Single(secondResults);
        Assert.Equal("assignment-first", first.ExternalAssignmentId);
        Assert.Equal("assignment-second", second.ExternalAssignmentId);
    }

    [Fact]
    public async Task ReadinessTasksPersistAndDriveTheSummary()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var created = await fixture.Service.CreateAsync(
            tenantId,
            new CreateEngagementRequest(
                "assignment-ready",
                "Prepared Host Event",
                "Cynthia Thompson",
                "New Covenant Fellowship",
                DateTimeOffset.UtcNow.AddDays(30),
                DateTimeOffset.UtcNow.AddDays(31),
                "Charlotte"),
            CancellationToken.None);
        fixture.Database.ChangeTracker.Clear();

        var withTask = await fixture.Service.AddTaskAsync(
            tenantId,
            created.Summary.Id,
            new CreateEngagementTaskRequest(
                "transportation",
                "Confirm airport pickup",
                "Host Coordinator",
                "Share the driver's name and mobile number.",
                DateTimeOffset.UtcNow.AddDays(20)),
            CancellationToken.None);
        var task = Assert.Single(withTask!.Tasks);
        Assert.Equal("open", task.Status);
        Assert.Equal(0, withTask.Summary.ReadinessPercent);
        Assert.Equal(1, withTask.Summary.OpenTasks);
        fixture.Database.ChangeTracker.Clear();

        var completed = await fixture.Service.UpdateTaskAsync(
            tenantId,
            created.Summary.Id,
            task.Id,
            new UpdateEngagementTaskRequest(
                "complete",
                task.Owner,
                task.Detail,
                task.DueAtUtc),
            CancellationToken.None);

        Assert.NotNull(completed);
        Assert.Equal(100, completed.Summary.ReadinessPercent);
        Assert.Equal(0, completed.Summary.OpenTasks);
        Assert.Equal("complete", Assert.Single(completed.Tasks).Status);
    }

    [Fact]
    public async Task UnsupportedIntegrationEventsAreRejectedWithoutAReceipt()
    {
        await using var fixture = CreateFixture();
        var envelope = new IntegrationEventEnvelope(
            Guid.NewGuid(),
            "CareCaseOpened",
            1,
            DateTimeOffset.UtcNow,
            Guid.NewGuid(),
            "care",
            JsonSerializer.SerializeToElement(new { subjectId = "person-1" }));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            fixture.Service.IngestAsync(envelope, CancellationToken.None));

        Assert.Empty(await fixture.Database.Assignments.ToListAsync());
        Assert.Empty(await fixture.Database.IntegrationReceipts.ToListAsync());
    }

    private static IntegrationEventEnvelope ApprovedAssignment(
        Guid eventId,
        Guid tenantId,
        string assignmentId,
        string title) =>
        new(
            eventId,
            "AssignmentApproved",
            1,
            DateTimeOffset.UtcNow,
            tenantId,
            "operations",
            JsonSerializer.SerializeToElement(new
            {
                assignmentId,
                title,
                speakerName = "Cynthia Thompson",
                hostOrganization = "New Covenant Fellowship",
                location = "Atlanta, Georgia",
                startsAtUtc = DateTimeOffset.UtcNow.AddDays(14),
                endsAtUtc = DateTimeOffset.UtcNow.AddDays(15)
            }));

    private static TestFixture CreateFixture()
    {
        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .UseInMemoryDatabase($"engagements-tests-{Guid.NewGuid():N}")
            .Options;
        var database = new EngagementsDbContext(options);
        return new TestFixture(database, new EngagementsService(database));
    }

    private sealed class TestFixture(
        EngagementsDbContext database,
        EngagementsService service) : IAsyncDisposable
    {
        public EngagementsDbContext Database { get; } = database;
        public EngagementsService Service { get; } = service;

        public async ValueTask DisposeAsync()
        {
            await Database.DisposeAsync();
        }
    }
}
