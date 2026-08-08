using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class EngagementPreparationLifecycleTests
{
    [Fact]
    public async Task ApprovedInvitationMustAcceptTermsBeforeHostCoordinationAndSyncsReadiness()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var request = await fixture.RequestService.CreateAsync(tenantId, ValidRequest(), CancellationToken.None);
        fixture.Requests.ChangeTracker.Clear();
        var approval = await fixture.RequestService.ApproveAsync(tenantId, request.Id, CancellationToken.None);
        Assert.NotNull(approval);
        var assignmentId = approval.Value.AssignmentId;
        fixture.Requests.ChangeTracker.Clear();
        fixture.Engagements.ChangeTracker.Clear();

        var preparation = await fixture.PreparationService.EnsureAsync(tenantId, assignmentId, CancellationToken.None);
        Assert.NotNull(preparation);
        Assert.Equal("pending", preparation.TermsStatus);
        Assert.Equal("locked", preparation.CoordinationStatus);
        Assert.Null(await fixture.PreparationService.GetCoordinationAsync(preparation.CoordinationToken, CancellationToken.None));
        fixture.Preparations.ChangeTracker.Clear();

        var accepted = await fixture.PreparationService.AcceptTermsAsync(
            preparation.TermsToken,
            new AcceptEngagementTermsRequest(true, "Pastor Jordan Ellis", "jordan@example.org", "Confirmed for the host ministry."),
            CancellationToken.None);
        Assert.NotNull(accepted);
        Assert.Equal("accepted", accepted.TermsStatus);
        Assert.Equal("in-progress", accepted.CoordinationStatus);
        Assert.NotNull(accepted.CoordinationToken);
        fixture.Preparations.ChangeTracker.Clear();
        fixture.Requests.ChangeTracker.Clear();
        fixture.Engagements.ChangeTracker.Clear();

        var requestAfterTerms = await fixture.Requests.Requests.SingleAsync(x => x.Id == request.Id);
        Assert.Equal("signed", requestAfterTerms.AgreementStatus);
        var assignmentAfterTerms = await fixture.Engagements.Assignments.Include(x => x.Tasks).Include(x => x.Documents).SingleAsync(x => x.Id == assignmentId);
        Assert.Contains(assignmentAfterTerms.Tasks, x => x.Title == "Finalize engagement agreement" && x.Status == "complete");
        Assert.Contains(assignmentAfterTerms.Documents, x => x.Name == "Accepted engagement terms" && x.Status == "received");
        fixture.Requests.ChangeTracker.Clear();
        fixture.Engagements.ChangeTracker.Clear();

        var update = new HostCoordinationUpdate(
            OutboundAirline: "Delta",
            OutboundFlightNumber: "DL1201",
            OutboundConfirmationNumber: "CTG123",
            OutboundDepartureAirport: "RIC",
            OutboundArrivalAirport: "ATL",
            OutboundDepartsAtUtc: new DateTimeOffset(2026, 9, 20, 10, 0, 0, TimeSpan.Zero),
            OutboundArrivesAtUtc: new DateTimeOffset(2026, 9, 20, 11, 30, 0, TimeSpan.Zero),
            ReturnAirline: "Delta",
            ReturnFlightNumber: "DL1202",
            ReturnConfirmationNumber: "CTG123",
            ReturnDepartureAirport: "ATL",
            ReturnArrivalAirport: "RIC",
            ReturnDepartsAtUtc: new DateTimeOffset(2026, 9, 22, 18, 0, 0, TimeSpan.Zero),
            ReturnArrivesAtUtc: new DateTimeOffset(2026, 9, 22, 19, 30, 0, TimeSpan.Zero),
            HotelName: "Covenant Hotel",
            HotelAddress: "200 Peachtree Street, Atlanta, GA",
            HotelConfirmationNumber: "HOTEL-77",
            HotelCheckInAtUtc: new DateTimeOffset(2026, 9, 20, 16, 0, 0, TimeSpan.Zero),
            HotelCheckOutAtUtc: new DateTimeOffset(2026, 9, 22, 11, 0, 0, TimeSpan.Zero),
            TransportationPlan: "Host driver will handle airport and venue transportation.",
            PickupContactName: "Naomi Brooks",
            PickupContactPhone: "+1 404 555 0199",
            Schedule: [new HostScheduleItemInput("Leadership intensive", new DateOnly(2026, 9, 21), "09:00", "12:00", "Main Sanctuary", "Leadership team only")],
            Contacts: [new HostContactInput("primary", "Pastor Jordan Ellis", "jordan@example.org", "+1 804 555 0100"), new HostContactInput("media", "Alex Green", "media@example.org", "+1 404 555 0110")],
            PromotionRequirements: "Use the approved CTG image and biography.",
            PrayerFocus: "Leadership renewal and regional alignment.",
            HostNotes: "Green room is available one hour before each session.",
            Submit: true);

        var coordinated = await fixture.PreparationService.SaveCoordinationAsync(accepted.CoordinationToken!, update, CancellationToken.None);
        Assert.NotNull(coordinated);
        Assert.Equal("submitted", coordinated.CoordinationStatus);
        Assert.Single(coordinated.Schedule);
        Assert.Equal(2, coordinated.Contacts.Count);
        fixture.Preparations.ChangeTracker.Clear();
        fixture.Engagements.ChangeTracker.Clear();

        var document = await fixture.PreparationService.AddDocumentAsync(
            accepted.CoordinationToken!, "final-schedule.pdf", "application/pdf", [1, 2, 3, 4], CancellationToken.None);
        Assert.NotNull(document);
        fixture.Engagements.ChangeTracker.Clear();

        var assignment = await fixture.Engagements.Assignments.Include(x => x.Tasks).Include(x => x.Documents).SingleAsync(x => x.Id == assignmentId);
        Assert.Equal("confirmed", assignment.TravelStatus);
        Assert.Equal("confirmed", assignment.LodgingStatus);
        Assert.Equal("confirmed", assignment.TransportationStatus);
        Assert.Equal("confirmed", assignment.HostStatus);
        Assert.Equal("received", assignment.DocumentsStatus);
        Assert.Equal("Pastor Jordan Ellis", assignment.HostContactName);
        Assert.Contains(assignment.Tasks, x => x.Title == "Complete host coordination" && x.Status == "complete");
        Assert.Contains(assignment.Tasks, x => x.Title == "Confirm travel and lodging plan" && x.Status == "complete");
        Assert.Contains(assignment.Documents, x => x.Name == "final-schedule.pdf" && x.Status == "received");
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
        TravelCoverageStatus: "yes",
        LodgingCoverageStatus: "yes",
        HonorariumStatus: "yes",
        TravelBookedBy: "host",
        HonorariumAmount: 2500m,
        HonorariumCurrency: "USD",
        PaymentStatus: "not-due",
        AgreementStatus: "not-started",
        EngagementStatus: "proposed");

    private static TestFixture CreateFixture()
    {
        var engagementOptions = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"engagements-preparation-{Guid.NewGuid():N}")
            .Options;
        var requestOptions = new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
            .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
            .UseInMemoryDatabase($"requests-preparation-{Guid.NewGuid():N}")
            .Options;
        var preparationOptions = new DbContextOptionsBuilder<EngagementPreparationDbContext>()
            .UseInMemoryDatabase($"preparation-{Guid.NewGuid():N}")
            .Options;
        var engagements = new EngagementsDbContext(engagementOptions);
        var requests = new SpeakingRequestsDbContext(requestOptions);
        var preparations = new EngagementPreparationDbContext(preparationOptions);
        var requestService = new SpeakingRequestsService(requests, engagements);
        var preparationService = new EngagementPreparationService(preparations, requests, engagements);
        return new TestFixture(engagements, requests, preparations, requestService, preparationService);
    }

    private sealed class TestFixture(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        EngagementPreparationDbContext preparations,
        SpeakingRequestsService requestService,
        EngagementPreparationService preparationService) : IAsyncDisposable
    {
        public EngagementsDbContext Engagements { get; } = engagements;
        public SpeakingRequestsDbContext Requests { get; } = requests;
        public EngagementPreparationDbContext Preparations { get; } = preparations;
        public SpeakingRequestsService RequestService { get; } = requestService;
        public EngagementPreparationService PreparationService { get; } = preparationService;

        public async ValueTask DisposeAsync()
        {
            await Preparations.DisposeAsync();
            await Requests.DisposeAsync();
            await Engagements.DisposeAsync();
        }
    }
}
