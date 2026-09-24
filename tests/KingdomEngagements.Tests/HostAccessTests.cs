using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace KingdomEngagements.Tests;

public sealed class HostAccessTests
{
    [Fact]
    public async Task Invitation_is_hashed_and_can_only_be_redeemed_once()
    {
        await using var fixture = CreateFixture();

        var issued = await fixture.Service.IssueAsync(
            fixture.TenantId,
            fixture.AssignmentId,
            CancellationToken.None);

        Assert.NotNull(issued);

        var stored = await fixture.HostAccess.Invitations.SingleAsync();
        Assert.NotEqual(issued.Token, stored.TokenHash);
        Assert.Equal(64, stored.TokenHash.Length);

        var session = await fixture.Service.RedeemAsync(
            issued.Token,
            CancellationToken.None);

        Assert.NotNull(session);
        Assert.Equal(fixture.AssignmentId, session.AssignmentId);
        Assert.Equal("Pastor Jordan Ellis", session.HostName);

        var secondAttempt = await fixture.Service.RedeemAsync(
            issued.Token,
            CancellationToken.None);

        Assert.Null(secondAttempt);
    }

    [Fact]
    public async Task Issuing_a_new_link_revokes_the_previous_link_and_session()
    {
        await using var fixture = CreateFixture();

        var first = await fixture.Service.IssueAsync(
            fixture.TenantId,
            fixture.AssignmentId,
            CancellationToken.None);
        Assert.NotNull(first);

        var firstSession = await fixture.Service.RedeemAsync(
            first.Token,
            CancellationToken.None);
        Assert.NotNull(firstSession);

        var second = await fixture.Service.IssueAsync(
            fixture.TenantId,
            fixture.AssignmentId,
            CancellationToken.None);
        Assert.NotNull(second);

        var firstRecord = await fixture.HostAccess.Invitations
            .SingleAsync(x => x.Id == first.Id);

        Assert.NotNull(firstRecord.RevokedAtUtc);

        var secondSession = await fixture.Service.RedeemAsync(
            second.Token,
            CancellationToken.None);

        Assert.NotNull(secondSession);
        Assert.NotEqual(firstSession.AccessId, secondSession.AccessId);
    }

    [Fact]
    public async Task Host_principal_is_scoped_to_one_tenant_and_one_engagement()
    {
        await using var fixture = CreateFixture();

        var issued = await fixture.Service.IssueAsync(
            fixture.TenantId,
            fixture.AssignmentId,
            CancellationToken.None);
        Assert.NotNull(issued);

        var session = await fixture.Service.RedeemAsync(
            issued.Token,
            CancellationToken.None);
        Assert.NotNull(session);

        var principal = HostAccessService.CreatePrincipal(session);

        Assert.Equal(
            fixture.TenantId,
            HostAccessIdentity.TenantId(principal));
        Assert.Equal(
            fixture.AssignmentId,
            HostAccessIdentity.AssignmentId(principal));
        Assert.Equal(
            session.AccessId,
            HostAccessIdentity.AccessId(principal));
        Assert.Equal("Pastor Jordan Ellis", HostAccessIdentity.DisplayName(principal));
    }

    private static TestFixture CreateFixture()
    {
        var tenantId = Guid.NewGuid();
        var assignmentId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        var engagementOptions = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"host-access-engagements-{Guid.NewGuid():N}")
            .Options;

        var preparationOptions = new DbContextOptionsBuilder<EngagementPreparationDbContext>()
            .UseInMemoryDatabase($"host-access-preparation-{Guid.NewGuid():N}")
            .Options;

        var hostAccessOptions = new DbContextOptionsBuilder<HostAccessDbContext>()
            .UseInMemoryDatabase($"host-access-{Guid.NewGuid():N}")
            .Options;

        var engagements = new EngagementsDbContext(TestTenants.Bypass, engagementOptions);
        var preparations = new EngagementPreparationDbContext(TestTenants.Bypass, preparationOptions);
        var hostAccess = new HostAccessDbContext(TestTenants.Bypass, hostAccessOptions);

        var now = DateTimeOffset.UtcNow;

        engagements.Assignments.Add(new EngagementAssignment
        {
            Id = assignmentId,
            TenantId = tenantId,
            ExternalAssignmentId = "host-access-test",
            Title = "Kingdom Leadership Gathering",
            SpeakerName = "Apostle Cynthia Thompson",
            HostOrganization = "New Covenant Fellowship",
            HostContactName = "Pastor Jordan Ellis",
            HostContactEmail = "jordan@example.org",
            Status = "planning",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });

        preparations.Preparations.Add(new EngagementPreparationRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            RequestId = requestId,
            ReferenceNumber = "CTG-HOST-ACCESS",
            EventName = "Kingdom Leadership Gathering",
            EventType = "Leadership Intensive",
            HostOrganization = "New Covenant Fellowship",
            EventStartDate = new DateOnly(2026, 10, 10),
            EventEndDate = new DateOnly(2026, 10, 12),
            TermsToken = Guid.NewGuid().ToString("N"),
            TermsTokenExpiresAtUtc = now.AddDays(30),
            TermsStatus = "pending",
            CoordinationToken = Guid.NewGuid().ToString("N"),
            CoordinationStatus = "locked",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });

        engagements.SaveChanges();
        preparations.SaveChanges();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:HostAccess:InvitationLifetimeHours"] = "24",
                ["KingdomOS:HostAccess:SessionLifetimeHours"] = "12"
            })
            .Build();

        var service = new HostAccessService(
            hostAccess,
            preparations,
            engagements,
            configuration,
            TestTenants.Bypass);

        return new TestFixture(
            tenantId,
            assignmentId,
            engagements,
            preparations,
            hostAccess,
            service);
    }

    private sealed class TestFixture(
        Guid tenantId,
        Guid assignmentId,
        EngagementsDbContext engagements,
        EngagementPreparationDbContext preparations,
        HostAccessDbContext hostAccess,
        HostAccessService service) : IAsyncDisposable
    {
        public Guid TenantId { get; } = tenantId;
        public Guid AssignmentId { get; } = assignmentId;
        public EngagementsDbContext Engagements { get; } = engagements;
        public EngagementPreparationDbContext Preparations { get; } = preparations;
        public HostAccessDbContext HostAccess { get; } = hostAccess;
        public HostAccessService Service { get; } = service;

        public async ValueTask DisposeAsync()
        {
            await HostAccess.DisposeAsync();
            await Preparations.DisposeAsync();
            await Engagements.DisposeAsync();
        }
    }
}
