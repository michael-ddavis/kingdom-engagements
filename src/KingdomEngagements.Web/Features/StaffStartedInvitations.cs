using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed record StartSpeakingInvitationInput(
    string ContactName,
    string ContactEmail,
    string? OrganizationName,
    string? EventName,
    string? ContactPhone,
    string? City,
    string? State,
    string? Country,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Note);

public sealed record StartedInvitationLinkResult(
    SpeakingRequestDetails Request,
    string CompletionUrl);

public sealed class StaffStartedInvitationsService(
    SpeakingRequestsDbContext requestsDatabase,
    SpeakingRequestsService speakingRequests)
{
    private const string WaitingOnHostStatus = "host-completion-needed";

    public async Task<SpeakingRequestDetails> StartAsync(
        Guid tenantId,
        StartSpeakingInvitationInput input,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);

        var contactName = Required(input.ContactName, nameof(input.ContactName));
        var contactEmail = Required(input.ContactEmail, nameof(input.ContactEmail)).ToLowerInvariant();
        if (!contactEmail.Contains('@'))
            throw new ArgumentException("A valid host email address is required.");

        var now = DateTimeOffset.UtcNow;
        var startDate = input.StartDate ?? default;
        var endDate = input.EndDate ?? input.StartDate ?? default;
        if (startDate != default && endDate != default && endDate < startDate)
            throw new ArgumentException("The end date cannot be before the start date.");

        var request = new SpeakingRequestRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReferenceNumber = $"CTG-{now:yyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}",
            EditToken = Guid.NewGuid().ToString("N"),
            EditTokenExpiresAtUtc = now.AddDays(30),
            OrganizationName = input.OrganizationName?.Trim() ?? string.Empty,
            EventName = input.EventName?.Trim() ?? string.Empty,
            EventType = string.Empty,
            ContactName = contactName,
            ContactEmail = contactEmail,
            ContactPhone = input.ContactPhone?.Trim() ?? string.Empty,
            City = input.City?.Trim() ?? string.Empty,
            State = input.State?.Trim(),
            Country = string.IsNullOrWhiteSpace(input.Country) ? "United States" : input.Country.Trim(),
            Region = null,
            TimeZone = string.Empty,
            VenueAddress = string.Empty,
            VenueName = string.Empty,
            StartDate = startDate,
            EndDate = endDate,
            MinistryRequest = string.Empty,
            ExpectedAttendance = 0,
            TravelCoverageStatus = "not-determined",
            LodgingCoverageStatus = "not-determined",
            HonorariumStatus = "not-determined",
            TravelBookedBy = "not-determined",
            HonorariumAmount = 0,
            HonorariumCurrency = "USD",
            PaymentStatus = "not-due",
            AgreementStatus = "not-started",
            EngagementStatus = "proposed",
            ReadinessPercentage = 0,
            Status = WaitingOnHostStatus,
            SubmittedAtUtc = now,
            UpdatedAtUtc = now,
        };

        var note = string.IsNullOrWhiteSpace(input.Note)
            ? $"CTG started invitation {request.ReferenceNumber} and is waiting for {contactName} to complete the host details."
            : $"CTG started invitation {request.ReferenceNumber}. {input.Note.Trim()}";
        request.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = request.Id,
            Type = "started-by-ctg",
            Message = note,
            Actor = "Cynthia Thompson Global",
            CreatedAtUtc = now,
        });

        requestsDatabase.Requests.Add(request);
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    public async Task<SpeakingRequestDetails?> GetForHostAsync(
        string token,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests.AsNoTracking()
            .Include(item => item.Communications)
            .SingleOrDefaultAsync(item => item.EditToken == token, cancellationToken);
        return HostCompletionLinkValid(request) ? Map(request!) : null;
    }

    public async Task<SpeakingRequestDetails?> CompleteAsync(
        string token,
        SpeakingRequestInput input,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests
            .Include(item => item.Communications)
            .SingleOrDefaultAsync(item => item.EditToken == token, cancellationToken);
        if (!HostCompletionLinkValid(request)) return null;

        // Reuse the established host-update path so the same validation, readiness
        // calculation, field mapping, and communication behavior applies. The state
        // change remains tracked in this scoped DbContext and is persisted only if
        // the full host submission validates successfully.
        request!.Status = "information-needed";
        return await speakingRequests.SubmitHostResponseAsync(
            token,
            new HostSpeakingRequestUpdate(input, "Host completed the CTG-started invitation details."),
            cancellationToken);
    }

    public async Task<SpeakingRequestDetails?> RefreshLinkAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests
            .Include(item => item.Communications)
            .SingleOrDefaultAsync(item => item.TenantId == tenantId && item.Id == id, cancellationToken);
        if (request is null) return null;
        if (request.Status != WaitingOnHostStatus)
            throw new InvalidOperationException($"Invitation {request.ReferenceNumber} is no longer waiting for initial host completion.");

        var now = DateTimeOffset.UtcNow;
        request.EditToken = Guid.NewGuid().ToString("N");
        request.EditTokenExpiresAtUtc = now.AddDays(30);
        request.UpdatedAtUtc = now;
        request.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = request.Id,
            Type = "host-link-refreshed",
            Message = "CTG refreshed the secure host completion link for this invitation.",
            Actor = "Cynthia Thompson Global",
            CreatedAtUtc = now,
        });
        await requestsDatabase.SaveChangesAsync(cancellationToken);
        return Map(request);
    }

    private static bool HostCompletionLinkValid(SpeakingRequestRecord? request) =>
        request is not null &&
        request.Status == WaitingOnHostStatus &&
        request.EditTokenExpiresAtUtc is DateTimeOffset expires &&
        expires > DateTimeOffset.UtcNow;

    private static SpeakingRequestDetails Map(SpeakingRequestRecord request) => new(
        request.Id, request.TenantId, request.ReferenceNumber, request.EditToken, request.EditTokenExpiresAtUtc,
        request.OrganizationName, request.EventName, request.EventType,
        request.ContactName, request.ContactEmail, request.ContactPhone,
        request.City, request.State, request.Country, request.Region, request.TimeZone,
        request.VenueAddress, request.VenueName, request.StartDate, request.EndDate,
        request.MinistryRequest, request.ExpectedAttendance,
        request.TravelCoverageStatus, request.LodgingCoverageStatus, request.HonorariumStatus,
        request.TravelBookedBy, request.HonorariumAmount, request.HonorariumCurrency,
        request.PaymentStatus, request.AgreementStatus, request.EngagementStatus,
        request.ReadinessPercentage, request.Status, request.DeclineReason, request.AssignmentId,
        request.SubmittedAtUtc, request.UpdatedAtUtc,
        request.Communications.OrderBy(item => item.CreatedAtUtc)
            .Select(item => new SpeakingRequestCommunicationDto(item.Id, item.Type, item.Message, item.Actor, item.CreatedAtUtc))
            .ToArray());

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();
}

public static class StaffStartedInvitationEndpoints
{
    public static IEndpointRouteBuilder MapStaffStartedInvitationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/engagements/started-requests").AllowAnonymous();
        publicGroup.MapGet("/{token}", async (
            string token,
            StaffStartedInvitationsService service,
            CancellationToken ct) =>
        {
            var item = await service.GetForHostAsync(token, ct);
            return item is null
                ? Results.NotFound(new { message = "This invitation completion link is invalid, expired, or has already been completed." })
                : Results.Ok(item);
        });
        publicGroup.MapPut("/{token}", async (
            string token,
            SpeakingRequestInput request,
            StaffStartedInvitationsService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.CompleteAsync(token, request, ct);
                return item is null
                    ? Results.NotFound(new { message = "This invitation completion link is invalid, expired, or has already been completed." })
                    : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [exception.Message] });
            }
        });

        var staffGroup = endpoints.MapGroup("/api/engagements/requests").RequireAuthorization();
        staffGroup.MapPost("/start", async (
            StartSpeakingInvitationInput request,
            HttpContext context,
            StaffStartedInvitationsService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.StartAsync(KingdomIdentity.TenantId(context.User, context.Request), request, ct);
                return Results.Ok(new StartedInvitationLinkResult(item, CompletionUrl(context.Request, item.EditToken)));
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["request"] = [exception.Message] });
            }
        }).RequireAuthorization("EngagementsWrite");

        staffGroup.MapPost("/{id:guid}/refresh-host-link", async (
            Guid id,
            HttpContext context,
            StaffStartedInvitationsService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.RefreshLinkAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
                return item is null
                    ? Results.NotFound()
                    : Results.Ok(new StartedInvitationLinkResult(item, CompletionUrl(context.Request, item.EditToken)));
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        }).RequireAuthorization("EngagementsWrite");

        return endpoints;
    }

    private static string CompletionUrl(HttpRequest request, string token) =>
        $"{request.Scheme}://{request.Host}/invite/apostle-cynthia/requests/{token}?mode=complete";
}
