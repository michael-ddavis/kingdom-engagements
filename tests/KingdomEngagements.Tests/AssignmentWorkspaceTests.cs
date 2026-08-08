using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class AssignmentWorkspaceTests
{
    [Fact]
    public async Task CoordinatorEditsReusePreparationAndDriveReadinessAndActivity()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var assignmentId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var assignment = new EngagementAssignment
        {
            Id = assignmentId,
            TenantId = tenantId,
            ExternalAssignmentId = "request:CTG-260808-DEMO",
            Title = "Kingdom Leadership Gathering",
            SpeakerName = "Cynthia Thompson",
            HostOrganization = "New Covenant Fellowship",
            HostContactName = "Jordan Ellis",
            HostContactEmail = "jordan@example.org",
            Location = "Atlanta, Georgia",
            StartsAtUtc = now.AddDays(20),
            EndsAtUtc = now.AddDays(22),
            Status = "approved",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), AssignmentId = assignmentId, Category = "host", Title = "Complete host coordination",
            Owner = "Engagement Coordinator", Status = "open", UpdatedAtUtc = now
        });
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), AssignmentId = assignmentId, Category = "travel", Title = "Confirm travel and lodging plan",
            Owner = "Engagement Coordinator", Status = "open", UpdatedAtUtc = now
        });
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), AssignmentId = assignmentId, Category = "documents", Title = "Finalize engagement agreement",
            Owner = "Engagement Coordinator", Status = "open", UpdatedAtUtc = now
        });
        fixture.Engagements.Assignments.Add(assignment);
        await fixture.Engagements.SaveChangesAsync();

        var request = new SpeakingRequestRecord
        {
            Id = requestId,
            TenantId = tenantId,
            ReferenceNumber = "CTG-260808-DEMO",
            EditToken = Guid.NewGuid().ToString("N"),
            OrganizationName = "New Covenant Fellowship",
            EventName = "Kingdom Leadership Gathering",
            EventType = "Leadership Intensive",
            ContactName = "Jordan Ellis",
            ContactEmail = "jordan@example.org",
            ContactPhone = "+1 804 555 0100",
            City = "Atlanta",
            State = "Georgia",
            Country = "United States",
            TimeZone = "America/New_York",
            VenueAddress = "100 Kingdom Way, Atlanta, GA 30303",
            VenueName = "New Covenant Fellowship",
            StartDate = new DateOnly(2026, 9, 20),
            EndDate = new DateOnly(2026, 9, 22),
            MinistryRequest = "Leadership intensive and Sunday ministry.",
            ExpectedAttendance = 450,
            TravelCoverageStatus = "yes",
            LodgingCoverageStatus = "yes",
            HonorariumStatus = "yes",
            TravelBookedBy = "host",
            HonorariumAmount = 2500,
            HonorariumCurrency = "USD",
            PaymentStatus = "not-due",
            AgreementStatus = "signed",
            EngagementStatus = "scheduled",
            ReadinessPercentage = 100,
            Status = "approved",
            AssignmentId = assignmentId,
            SubmittedAtUtc = now.AddDays(-2),
            UpdatedAtUtc = now
        };
        request.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = requestId,
            Type = "approved",
            Message = "Invitation approved and converted to an assignment.",
            Actor = "Cynthia Thompson Global",
            CreatedAtUtc = now
        });
        fixture.Requests.Requests.Add(request);
        await fixture.Requests.SaveChangesAsync();

        var initial = await fixture.Workspace.GetAsync(tenantId, assignmentId, CancellationToken.None);
        Assert.NotNull(initial);
        Assert.Equal("accepted", initial.Preparation.TermsStatus);
        Assert.Single(initial.Preparation.Coordination.Contacts);
        Assert.Equal("Jordan Ellis", initial.Preparation.Coordination.Contacts[0].Name);

        var saved = await fixture.Workspace.SaveCoordinationAsync(
            tenantId,
            assignmentId,
            CompleteCoordination(submit: true),
            "Demo Coordinator",
            CancellationToken.None);

        Assert.NotNull(saved);
        Assert.Equal("submitted", saved.Preparation.CoordinationStatus);
        Assert.True(saved.Readiness.OverallPercent >= 80);
        Assert.Contains(saved.Activity, x => x.Title == "Assignment marked prepared");
        Assert.Contains(saved.Activity, x => x.Title == "Invitation approved");

        fixture.Engagements.ChangeTracker.Clear();
        var synced = await fixture.Engagements.Assignments.Include(x => x.Tasks).SingleAsync(x => x.Id == assignmentId);
        Assert.Equal("confirmed", synced.TravelStatus);
        Assert.Equal("confirmed", synced.LodgingStatus);
        Assert.Equal("confirmed", synced.TransportationStatus);
        Assert.Equal("confirmed", synced.HostStatus);
        Assert.Equal("complete", synced.Tasks.Single(x => x.Title == "Complete host coordination").Status);
        Assert.Equal("complete", synced.Tasks.Single(x => x.Title == "Confirm travel and lodging plan").Status);
        Assert.Equal("complete", synced.Tasks.Single(x => x.Title == "Finalize engagement agreement").Status);

        var document = await fixture.Workspace.AddDocumentAsync(
            tenantId,
            assignmentId,
            "final-host-schedule.pdf",
            "application/pdf",
            [1, 2, 3, 4],
            "Demo Coordinator",
            CancellationToken.None);

        Assert.NotNull(document);
        var withDocument = await fixture.Workspace.GetAsync(tenantId, assignmentId, CancellationToken.None);
        Assert.NotNull(withDocument);
        Assert.Equal(100, withDocument.Readiness.Lanes.Single(x => x.Key == "documents").Percent);
        Assert.Contains(withDocument.Activity, x => x.Title == "Assignment document added");

        var deleted = await fixture.Workspace.DeleteDocumentAsync(
            tenantId,
            assignmentId,
            document.Id,
            "Demo Coordinator",
            CancellationToken.None);
        Assert.True(deleted);
        var afterDelete = await fixture.Workspace.GetAsync(tenantId, assignmentId, CancellationToken.None);
        Assert.NotNull(afterDelete);
        Assert.DoesNotContain(afterDelete.Preparation.Coordination.Documents, x => x.Id == document.Id);
        Assert.Contains(afterDelete.Activity, x => x.Title == "Assignment document removed");
    }

    [Fact]
    public async Task CannotMarkAssignmentPreparedBeforeTermsAreAccepted()
    {
        await using var fixture = CreateFixture();
        var tenantId = Guid.NewGuid();
        var assignmentId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        fixture.Engagements.Assignments.Add(new EngagementAssignment
        {
            Id = assignmentId,
            TenantId = tenantId,
            ExternalAssignmentId = "request:CTG-PENDING",
            Title = "Pending Terms Gathering",
            SpeakerName = "Cynthia Thompson",
            HostOrganization = "Host Church",
            Status = "approved",
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });
        fixture.Requests.Requests.Add(new SpeakingRequestRecord
        {
            Id = requestId,
            TenantId = tenantId,
            ReferenceNumber = "CTG-PENDING",
            EditToken = Guid.NewGuid().ToString("N"),
            OrganizationName = "Host Church",
            EventName = "Pending Terms Gathering",
            EventType = "Conference",
            ContactName = "Host Contact",
            ContactEmail = "host@example.org",
            ContactPhone = "+1 804 555 0101",
            City = "Richmond",
            State = "Virginia",
            Country = "United States",
            TimeZone = "America/New_York",
            VenueAddress = "1 Main Street",
            VenueName = "Host Church",
            StartDate = new DateOnly(2026, 9, 25),
            EndDate = new DateOnly(2026, 9, 25),
            MinistryRequest = "Evening ministry.",
            ExpectedAttendance = 200,
            TravelCoverageStatus = "yes",
            LodgingCoverageStatus = "yes",
            HonorariumStatus = "yes",
            TravelBookedBy = "host",
            HonorariumCurrency = "USD",
            PaymentStatus = "not-due",
            AgreementStatus = "sent",
            EngagementStatus = "scheduled",
            Status = "approved",
            AssignmentId = assignmentId,
            SubmittedAtUtc = now,
            UpdatedAtUtc = now
        });
        await fixture.Engagements.SaveChangesAsync();
        await fixture.Requests.SaveChangesAsync();

        await fixture.Workspace.GetAsync(tenantId, assignmentId, CancellationToken.None);
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Workspace.SaveCoordinationAsync(
            tenantId,
            assignmentId,
            CompleteCoordination(submit: true),
            "Demo Coordinator",
            CancellationToken.None));
    }

    private static HostCoordinationUpdate CompleteCoordination(bool submit) => new(
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
        TransportationPlan: "Host driver will handle airport, hotel and venue transportation.",
        PickupContactName: "Naomi Brooks",
        PickupContactPhone: "+1 404 555 0199",
        Schedule: [new HostScheduleItemInput("Leadership intensive", new DateOnly(2026, 9, 21), "09:00", "12:00", "Main Sanctuary", "Leadership team only")],
        Contacts: [
            new HostContactInput("primary", "Jordan Ellis", "jordan@example.org", "+1 804 555 0100"),
            new HostContactInput("media", "Alex Green", "media@example.org", "+1 404 555 0110")
        ],
        PromotionRequirements: "Use approved CTG imagery and biography.",
        PrayerFocus: "Leadership renewal and regional alignment.",
        HostNotes: "Green room available one hour before each session.",
        Submit: submit);

    private static TestFixture CreateFixture()
    {
        var engagements = new EngagementsDbContext(new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseInMemoryDatabase($"workspace-engagements-{Guid.NewGuid():N}")
            .Options);
        var requests = new SpeakingRequestsDbContext(new DbContextOptionsBuilder<SpeakingRequestsDbContext>()
            .ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>()
            .UseInMemoryDatabase($"workspace-requests-{Guid.NewGuid():N}")
            .Options);
        var preparation = new EngagementPreparationDbContext(new DbContextOptionsBuilder<EngagementPreparationDbContext>()
            .UseInMemoryDatabase($"workspace-preparation-{Guid.NewGuid():N}")
            .Options);
        var activity = new AssignmentWorkspaceDbContext(new DbContextOptionsBuilder<AssignmentWorkspaceDbContext>()
            .UseInMemoryDatabase($"workspace-activity-{Guid.NewGuid():N}")
            .Options);
        var preparationService = new EngagementPreparationService(preparation, requests, engagements);
        var workspace = new AssignmentWorkspaceService(activity, preparation, requests, engagements, preparationService);
        return new TestFixture(engagements, requests, preparation, activity, workspace);
    }

    private sealed class TestFixture(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        EngagementPreparationDbContext preparation,
        AssignmentWorkspaceDbContext activity,
        AssignmentWorkspaceService workspace) : IAsyncDisposable
    {
        public EngagementsDbContext Engagements { get; } = engagements;
        public SpeakingRequestsDbContext Requests { get; } = requests;
        public EngagementPreparationDbContext Preparation { get; } = preparation;
        public AssignmentWorkspaceDbContext Activity { get; } = activity;
        public AssignmentWorkspaceService Workspace { get; } = workspace;

        public async ValueTask DisposeAsync()
        {
            await Activity.DisposeAsync();
            await Preparation.DisposeAsync();
            await Requests.DisposeAsync();
            await Engagements.DisposeAsync();
        }
    }
}
