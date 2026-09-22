using System.Text.Json;
using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class EngagementLaneWorkspaceTests
{
    [Fact]
    public async Task Travel_updates_do_not_overwrite_lodging_or_media_contacts()
    {
        await using var fixture = CreateFixture();
        var assignment = await fixture.CreateAssignmentAsync();

        await fixture.Lanes.UpdateLodgingAsync(
            fixture.TenantId,
            assignment.Id,
            new UpdateLodgingLaneRequest(
                "Covenant Hotel",
                "200 Peachtree Street",
                "HOTEL-77",
                DateTimeOffset.UtcNow.AddDays(10),
                DateTimeOffset.UtcNow.AddDays(12),
                [new HostContactInput("hotel", "Hotel Desk", "stay@example.org", "404-555-1000")]),
            "Lodging Lead",
            CancellationToken.None);

        await fixture.Lanes.UpdateMediaAsync(
            fixture.TenantId,
            assignment.Id,
            new UpdateMediaLaneRequest(
                "Use the approved CTG headshot and biography.",
                [new HostContactInput("media", "Media Director", "media@example.org", "404-555-2000")]),
            "Media Lead",
            CancellationToken.None);

        var travel = await fixture.Lanes.UpdateTravelAsync(
            fixture.TenantId,
            assignment.Id,
            new UpdateTravelLaneRequest(
                "Delta",
                "DL1201",
                "ABC123",
                "RIC",
                "ATL",
                DateTimeOffset.UtcNow.AddDays(10),
                DateTimeOffset.UtcNow.AddDays(10).AddHours(2),
                "Delta",
                "DL1202",
                "ABC123",
                "ATL",
                "RIC",
                DateTimeOffset.UtcNow.AddDays(12),
                DateTimeOffset.UtcNow.AddDays(12).AddHours(2),
                [new HostContactInput("airline", "Delta Groups", "groups@example.org", "800-555-2000")]),
            "Travel Lead",
            CancellationToken.None);

        Assert.NotNull(travel);
        Assert.Equal("DL1201", travel.OutboundFlightNumber);

        var lodging = await fixture.Lanes.GetLodgingAsync(
            fixture.TenantId,
            assignment.Id,
            CancellationToken.None);
        Assert.NotNull(lodging);
        Assert.Equal("Covenant Hotel", lodging.HotelName);
        Assert.Contains(lodging.Contacts, contact => contact.Type == "hotel" && contact.Name == "Hotel Desk");

        var media = await fixture.Lanes.GetMediaAsync(
            fixture.TenantId,
            assignment.Id,
            CancellationToken.None);
        Assert.NotNull(media);
        Assert.Contains(media.Contacts, contact => contact.Type == "media" && contact.Name == "Media Director");
    }

    [Fact]
    public async Task A_lane_cannot_write_another_lanes_contact_type()
    {
        await using var fixture = CreateFixture();
        var assignment = await fixture.CreateAssignmentAsync();

        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            fixture.Lanes.UpdateTravelAsync(
                fixture.TenantId,
                assignment.Id,
                new UpdateTravelLaneRequest(
                    null, null, null, null, null, null, null,
                    null, null, null, null, null, null, null,
                    [new HostContactInput("media", "Wrong Lane", "media@example.org", null)]),
                "Travel Lead",
                CancellationToken.None));

        Assert.Contains("cannot be edited from the travel lane", exception.Message);
    }

    [Fact]
    public async Task Media_assets_store_operational_metadata_without_embedding_video_payloads()
    {
        await using var fixture = CreateFixture();
        var assignment = await fixture.CreateAssignmentAsync();

        var created = await fixture.Lanes.CreateMediaAssetAsync(
            fixture.TenantId,
            assignment.Id,
            new CreateMediaAssetRequest(
                "Event promo reel",
                "video",
                "social promotion",
                "requested",
                "host",
                null,
                "https://media.example.org/promo-reel",
                "Host will replace the draft with the final approved reel."),
            "media-user",
            "Media Lead",
            CancellationToken.None);

        Assert.NotNull(created);
        Assert.Equal("video", created.AssetType);
        Assert.Equal("requested", created.Status);
        Assert.Equal("https://media.example.org/promo-reel", created.ExternalUrl);

        var media = await fixture.Lanes.GetMediaAsync(
            fixture.TenantId,
            assignment.Id,
            CancellationToken.None);
        var asset = Assert.Single(media!.Assets);
        Assert.Equal("Event promo reel", asset.Name);
        Assert.Equal("host", asset.Source);
    }

    [Fact]
    public async Task Executive_brief_does_not_expose_host_access_tokens_or_financial_fields()
    {
        await using var fixture = CreateFixture();
        var assignment = await fixture.CreateAssignmentAsync();

        var brief = await fixture.Lanes.GetExecutiveBriefAsync(
            fixture.TenantId,
            assignment.Id,
            CancellationToken.None);

        Assert.NotNull(brief);
        var json = JsonSerializer.Serialize(brief);
        Assert.False(json.Contains("TermsToken", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("CoordinationToken", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("Honorarium", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("PaymentStatus", StringComparison.OrdinalIgnoreCase));
    }

    private static TestFixture CreateFixture()
    {
        var engagementOptions = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"lane-engagements-{Guid.NewGuid():N}")
            .Options;
        var requestOptions = new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
            .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
            .UseInMemoryDatabase($"lane-requests-{Guid.NewGuid():N}")
            .Options;
        var preparationOptions = new DbContextOptionsBuilder<EngagementPreparationDbContext>()
            .UseInMemoryDatabase($"lane-preparation-{Guid.NewGuid():N}")
            .Options;
        var activityOptions = new DbContextOptionsBuilder<AssignmentWorkspaceDbContext>()
            .UseInMemoryDatabase($"lane-activity-{Guid.NewGuid():N}")
            .Options;

        var engagements = new EngagementsDbContext(engagementOptions);
        var requests = new SpeakingRequestsDbContext(requestOptions);
        var preparations = new EngagementPreparationDbContext(preparationOptions);
        var activity = new AssignmentWorkspaceDbContext(activityOptions);

        var preparationService = new EngagementPreparationService(preparations, requests, engagements);
        var workspace = new AssignmentWorkspaceService(
            activity,
            preparations,
            requests,
            engagements,
            preparationService);
        var responsibilities = new EngagementResponsibilityService(engagements);
        var lanes = new EngagementLaneWorkspaceService(
            preparations,
            engagements,
            activity,
            preparationService,
            workspace,
            responsibilities);

        return new TestFixture(
            Guid.NewGuid(),
            engagements,
            requests,
            preparations,
            activity,
            lanes);
    }

    private sealed class TestFixture(
        Guid tenantId,
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        EngagementPreparationDbContext preparations,
        AssignmentWorkspaceDbContext activity,
        EngagementLaneWorkspaceService lanes) : IAsyncDisposable
    {
        public Guid TenantId { get; } = tenantId;
        public EngagementsDbContext Engagements { get; } = engagements;
        public SpeakingRequestsDbContext Requests { get; } = requests;
        public EngagementPreparationDbContext Preparations { get; } = preparations;
        public AssignmentWorkspaceDbContext Activity { get; } = activity;
        public EngagementLaneWorkspaceService Lanes { get; } = lanes;

        public async Task<EngagementAssignment> CreateAssignmentAsync()
        {
            var now = DateTimeOffset.UtcNow;
            var assignment = new EngagementAssignment
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                ExternalAssignmentId = $"lane-{Guid.NewGuid():N}",
                Title = "Kingdom Leadership Gathering",
                SpeakerName = "Cynthia Thompson",
                HostOrganization = "New Covenant Fellowship",
                HostContactName = "Pastor Jordan Ellis",
                HostContactEmail = "jordan@example.org",
                Location = "Atlanta, Georgia",
                StartsAtUtc = now.AddDays(10),
                EndsAtUtc = now.AddDays(12),
                Status = "planning",
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            Engagements.Assignments.Add(assignment);
            await Engagements.SaveChangesAsync();
            Engagements.ChangeTracker.Clear();
            return assignment;
        }

        public async ValueTask DisposeAsync()
        {
            await Activity.DisposeAsync();
            await Preparations.DisposeAsync();
            await Requests.DisposeAsync();
            await Engagements.DisposeAsync();
        }
    }
}
