using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class SpeakingRequestLifecycleTests
{
    [Fact]
    public async Task StaffStartedInvitationKeepsOneReferenceThroughHostCompletion()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();

        var started = await fixture.StartedService.StartAsync(
            tenantId,
            new StartSpeakingInvitationInput(
                ContactName: "Pastor James Okoro",
                ContactEmail: "pastor.okoro@example.org",
                OrganizationName: "Kingdom Leadership Network",
                EventName: "Leadership Conference",
                ContactPhone: "+234 800 555 0142",
                City: "Lagos",
                State: "Lagos State",
                Country: "Nigeria",
                StartDate: new DateOnly(2027, 3, 18),
                EndDate: new DateOnly(2027, 3, 21),
                Note: "Spoke with Apostle after service. Formal information pending."),
            CancellationToken.None);

        Assert.Equal("host-completion-needed", started.Status);
        Assert.StartsWith("CTG-", started.ReferenceNumber);
        Assert.NotNull(started.EditTokenExpiresAtUtc);
        Assert.Contains(started.Communications, item => item.Type == "started-by-ctg");

        fixture.Requests.ChangeTracker.Clear();
        var hostOpened = await fixture.StartedService.GetForHostAsync(started.EditToken, CancellationToken.None);
        Assert.NotNull(hostOpened);
        Assert.Equal(started.Id, hostOpened.Id);
        Assert.Equal(started.ReferenceNumber, hostOpened.ReferenceNumber);

        fixture.Requests.ChangeTracker.Clear();
        var completed = await fixture.StartedService.CompleteAsync(
            started.EditToken,
            ValidRequest() with
            {
                OrganizationName = "Kingdom Leadership Network",
                EventName = "Leadership Conference",
                ContactName = "Pastor James Okoro",
                ContactEmail = "pastor.okoro@example.org",
                ContactPhone = "+234 800 555 0142",
                City = "Lagos",
                State = "Lagos State",
                Country = "Nigeria",
                TimeZone = "Africa/Lagos",
                VenueAddress = "Victoria Island, Lagos",
                VenueName = "Kingdom Leadership Centre",
                StartDate = new DateOnly(2027, 3, 18),
                EndDate = new DateOnly(2027, 3, 21),
            },
            CancellationToken.None);

        Assert.NotNull(completed);
        Assert.Equal(started.Id, completed.Id);
        Assert.Equal(started.ReferenceNumber, completed.ReferenceNumber);
        Assert.Equal("awaiting-review", completed.Status);
        Assert.Contains(completed.Communications, item => item.Type == "started-by-ctg");
        Assert.Contains(completed.Communications, item => item.Type == "host-responded");

        fixture.Requests.ChangeTracker.Clear();
        Assert.Null(await fixture.StartedService.GetForHostAsync(started.EditToken, CancellationToken.None));
        Assert.Single(await fixture.Requests.Requests.ToListAsync());
    }

    [Fact]
    public async Task RequestInformationHostResubmissionAndApprovalReuseOneRequestAndOneAssignment()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var created = await fixture.Service.CreateAsync(tenantId, ValidRequest(), CancellationToken.None);

        Assert.Equal("awaiting-review", created.Status);
        Assert.StartsWith("CTG-", created.ReferenceNumber);
        Assert.Single(created.Communications);
        fixture.Requests.ChangeTracker.Clear();

        var requested = await fixture.Service.RequestInformationAsync(
            tenantId,
            created.Id,
            "Please confirm who will arrange primary travel.",
            CancellationToken.None);

        Assert.NotNull(requested);
        Assert.Equal("information-needed", requested.Status);
        Assert.NotNull(requested.EditTokenExpiresAtUtc);
        Assert.Contains(requested.Communications, item => item.Type == "information-requested");
        fixture.Requests.ChangeTracker.Clear();

        var updatedInput = ValidRequest() with { TravelBookedBy = "host", TravelCoverageStatus = "yes" };
        var resubmitted = await fixture.Service.SubmitHostResponseAsync(
            requested.EditToken,
            new HostSpeakingRequestUpdate(updatedInput, "The host ministry will book the primary travel."),
            CancellationToken.None);

        Assert.NotNull(resubmitted);
        Assert.Equal(created.Id, resubmitted.Id);
        Assert.Equal("awaiting-review", resubmitted.Status);
        Assert.Equal("host", resubmitted.TravelBookedBy);
        Assert.Contains(resubmitted.Communications, item => item.Type == "host-responded");
        fixture.Requests.ChangeTracker.Clear();

        var approved = await fixture.Service.ApproveAsync(tenantId, created.Id, CancellationToken.None);
        Assert.NotNull(approved);
        Assert.Equal("approved", approved.Value.Request.Status);
        Assert.Equal(approved.Value.AssignmentId, approved.Value.Request.AssignmentId);

        fixture.Engagements.ChangeTracker.Clear();
        fixture.Requests.ChangeTracker.Clear();
        var approvedAgain = await fixture.Service.ApproveAsync(tenantId, created.Id, CancellationToken.None);
        Assert.NotNull(approvedAgain);
        Assert.Equal(approved.Value.AssignmentId, approvedAgain.Value.AssignmentId);
        Assert.Single(await fixture.Engagements.Assignments.ToListAsync());
        Assert.Single(await fixture.Requests.Requests.ToListAsync());

        var assignment = await fixture.Engagements.Assignments.Include(x => x.Tasks).SingleAsync();
        Assert.Equal($"request:{created.ReferenceNumber}", assignment.ExternalAssignmentId);
        Assert.Equal("New Covenant Fellowship", assignment.HostOrganization);
        Assert.Equal("Jordan Ellis", assignment.HostContactName);
        Assert.Contains(assignment.Tasks, x => x.Title == "Complete host coordination");
    }

    [Fact]
    public async Task DeclineRequiresAReasonAndPreventsLaterApproval()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var created = await fixture.Service.CreateAsync(tenantId, ValidRequest(), CancellationToken.None);
        fixture.Requests.ChangeTracker.Clear();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            fixture.Service.DeclineAsync(tenantId, created.Id, " ", CancellationToken.None));

        var declined = await fixture.Service.DeclineAsync(
            tenantId,
            created.Id,
            "The requested dates are not available.",
            CancellationToken.None);

        Assert.NotNull(declined);
        Assert.Equal("declined", declined.Status);
        Assert.Equal("The requested dates are not available.", declined.DeclineReason);
        fixture.Requests.ChangeTracker.Clear();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            fixture.Service.ApproveAsync(tenantId, created.Id, CancellationToken.None));
        Assert.Empty(await fixture.Engagements.Assignments.ToListAsync());
    }

    private static SpeakingRequestInput ValidRequest() => new(
        OrganizationName: "New Covenant Fellowship",
        EventName: "Kingdom Leadership Gathering",
        EventType: "Leadership Intensive",
        ContactName: "Jordan Ellis",
        ContactEmail: "jordan@example.org",
        ContactPhone: "+1 804 555 0100",
        City: "Atlanta",
        State: "Georgia",
        Country: "United States",
        Region: null,
        TimeZone: "America/New_York",
        VenueAddress: "100 Kingdom Way, Atlanta, GA 30303",
        VenueName: "New Covenant Fellowship",
        StartDate: new DateOnly(2026, 9, 20),
        EndDate: new DateOnly(2026, 9, 22),
        MinistryRequest: "Sunday ministry plus a leadership intensive.",
        ExpectedAttendance: 450,
        TravelCoverageStatus: "not-determined",
        LodgingCoverageStatus: "yes",
        HonorariumStatus: "yes",
        TravelBookedBy: "not-determined",
        HonorariumAmount: 2500m,
        HonorariumCurrency: "USD",
        PaymentStatus: "not-due",
        AgreementStatus: "not-started",
        EngagementStatus: "proposed");

    private static TestFixture CreateFixture()
    {
        var engagementOptions = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"engagements-lifecycle-{Guid.NewGuid():N}")
            .Options;
        var requestOptions = new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
            .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
            .UseInMemoryDatabase($"engagement-requests-{Guid.NewGuid():N}")
            .Options;
        var engagements = new EngagementsDbContext(engagementOptions);
        var requests = new SpeakingRequestsDbContext(requestOptions);
        var service = new SpeakingRequestsService(requests, engagements);
        return new TestFixture(
            engagements,
            requests,
            service,
            new StaffStartedInvitationsService(requests, service));
    }

    private sealed class TestFixture(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        SpeakingRequestsService service,
        StaffStartedInvitationsService startedService) : IAsyncDisposable
    {
        public EngagementsDbContext Engagements { get; } = engagements;
        public SpeakingRequestsDbContext Requests { get; } = requests;
        public SpeakingRequestsService Service { get; } = service;
        public StaffStartedInvitationsService StartedService { get; } = startedService;

        public async ValueTask DisposeAsync()
        {
            await Requests.DisposeAsync();
            await Engagements.DisposeAsync();
        }
    }
}