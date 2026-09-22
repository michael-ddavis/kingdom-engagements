using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class EngagementResponsibilityTests
{
    [Fact]
    public async Task Standing_owner_applies_to_every_engagement_in_the_lane()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var first = await fixture.CreateAssignmentAsync(tenantId, "first");
        var second = await fixture.CreateAssignmentAsync(tenantId, "second");

        await fixture.Service.SetStandingOwnerAsync(
            tenantId,
            "media",
            new AssignResponsibilityOwnerRequest("user-media", "Media Lead", "media@example.org"),
            "director",
            "Prophet Courtney Beecham",
            CancellationToken.None);

        var firstLane = await fixture.Service.GetLaneAsync(tenantId, first.Id, "media", CancellationToken.None);
        var secondLane = await fixture.Service.GetLaneAsync(tenantId, second.Id, "media", CancellationToken.None);

        Assert.Equal("user-media", firstLane!.Owner!.UserSubject);
        Assert.Equal("standing", firstLane.Owner.Source);
        Assert.Equal("user-media", secondLane!.Owner!.UserSubject);
    }

    [Fact]
    public async Task Engagement_override_replaces_the_standing_owner_for_one_engagement()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var assignment = await fixture.CreateAssignmentAsync(tenantId, "override");

        await fixture.Service.SetStandingOwnerAsync(
            tenantId,
            "travel",
            new AssignResponsibilityOwnerRequest("travel-default", "Default Travel Lead", null),
            "director",
            "Prophet Courtney Beecham",
            CancellationToken.None);

        await fixture.Service.SetEngagementOwnerAsync(
            tenantId,
            assignment.Id,
            "travel",
            new AssignResponsibilityOwnerRequest("travel-special", "Special Travel Lead", null),
            "director",
            "Prophet Courtney Beecham",
            CancellationToken.None);

        var lane = await fixture.Service.GetLaneAsync(tenantId, assignment.Id, "travel", CancellationToken.None);

        Assert.Equal("travel-special", lane!.Owner!.UserSubject);
        Assert.Equal("engagement", lane.Owner.Source);
    }

    [Fact]
    public async Task Lane_completion_records_who_completed_the_work()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var assignment = await fixture.CreateAssignmentAsync(tenantId, "complete");

        await fixture.Service.SetStandingOwnerAsync(
            tenantId,
            "media",
            new AssignResponsibilityOwnerRequest("user-media", "Media Lead", null),
            "director",
            "Prophet Courtney Beecham",
            CancellationToken.None);

        var updated = await fixture.Service.UpdateProgressAsync(
            tenantId,
            assignment.Id,
            "media",
            new UpdateEngagementLaneProgressRequest("complete", "Final media package delivered."),
            "user-media",
            "Media Lead",
            CancellationToken.None);

        Assert.Equal("complete", updated!.Status);
        Assert.Equal("Media Lead", updated.CompletedByName);
        Assert.NotNull(updated.CompletedAtUtc);
        Assert.Equal("Final media package delivered.", updated.Detail);
    }

    [Fact]
    public async Task Optional_lanes_start_not_applicable_until_the_director_enables_them()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var assignment = await fixture.CreateAssignmentAsync(tenantId, "production");

        var initial = await fixture.Service.GetLaneAsync(tenantId, assignment.Id, "production", CancellationToken.None);
        Assert.False(initial!.IsApplicable);
        Assert.Equal("not-applicable", initial.Status);

        var enabled = await fixture.Service.ConfigureLaneAsync(
            tenantId,
            assignment.Id,
            "production",
            new ConfigureEngagementLaneRequest(true, DateTimeOffset.UtcNow.AddDays(5)),
            "director",
            "Prophet Courtney Beecham",
            CancellationToken.None);

        Assert.True(enabled!.IsApplicable);
        Assert.Equal("not-started", enabled.Status);
        Assert.NotNull(enabled.DueAtUtc);
    }

    private static TestFixture CreateFixture()
    {
        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"responsibility-tests-{Guid.NewGuid():N}")
            .Options;

        var database = new EngagementsDbContext(options);
        return new TestFixture(database, new EngagementResponsibilityService(database));
    }

    private sealed class TestFixture(
        EngagementsDbContext database,
        EngagementResponsibilityService service) : IAsyncDisposable
    {
        public EngagementsDbContext Database { get; } = database;
        public EngagementResponsibilityService Service { get; } = service;

        public async Task<EngagementAssignment> CreateAssignmentAsync(Guid tenantId, string suffix)
        {
            var now = DateTimeOffset.UtcNow;
            var assignment = new EngagementAssignment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ExternalAssignmentId = $"assignment-{suffix}",
                Title = $"Engagement {suffix}",
                SpeakerName = "Cynthia Thompson",
                HostOrganization = "Demo Host",
                Location = "Richmond, Virginia",
                StartsAtUtc = now.AddDays(14),
                EndsAtUtc = now.AddDays(15),
                Status = "planning",
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            Database.Assignments.Add(assignment);
            await Database.SaveChangesAsync();
            Database.ChangeTracker.Clear();
            return assignment;
        }

        public async ValueTask DisposeAsync()
        {
            await Database.DisposeAsync();
        }
    }
}
