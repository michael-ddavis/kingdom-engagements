using System.Text.RegularExpressions;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

/// <summary>
/// Gives Pastor Derwin Hickman's itinerant invitations the same host/review model
/// as the Cynthia Thompson flow while preserving Heyy King's tenant and speaker identity.
/// </summary>
public sealed class HickmanSpeakingRequestsService(
    SpeakingRequestsService speakingRequests,
    SpeakingRequestsDbContext requestsDatabase,
    EngagementsDbContext engagementsDatabase)
{
    private const string TeamName = "Heyy King Itinerant Ministry";
    private const string SpeakerName = "Pastor Derwin Hickman";

    public async Task<SpeakingRequestDetails> CreateAsync(
        SpeakingRequestInput input,
        CancellationToken cancellationToken)
    {
        var created = await speakingRequests.CreateAsync(
            KingdomIdentity.HeyyKingTenantId,
            input,
            cancellationToken);

        var record = await requestsDatabase.Requests.SingleAsync(
            item => item.Id == created.Id && item.TenantId == KingdomIdentity.HeyyKingTenantId,
            cancellationToken);
        if (record.ReferenceNumber.StartsWith("CTG-", StringComparison.OrdinalIgnoreCase))
        {
            record.ReferenceNumber = $"HK-{record.ReferenceNumber[4..]}";
            record.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await requestsDatabase.SaveChangesAsync(cancellationToken);
        }

        return (await speakingRequests.GetAsync(
            KingdomIdentity.HeyyKingTenantId,
            created.Id,
            cancellationToken))!;
    }

    public async Task<SpeakingRequestDetails?> GetForHostAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (!await BelongsToHeyyKingAsync(token, cancellationToken)) return null;
        return await speakingRequests.GetForHostAsync(token, cancellationToken);
    }

    public async Task<SpeakingRequestDetails?> SubmitHostResponseAsync(
        string token,
        HostSpeakingRequestUpdate update,
        CancellationToken cancellationToken)
    {
        if (!await BelongsToHeyyKingAsync(token, cancellationToken)) return null;
        return await speakingRequests.SubmitHostResponseAsync(token, update, cancellationToken);
    }

    public async Task<SpeakingRequestDetails?> RequestInformationAsync(
        Guid id,
        string message,
        CancellationToken cancellationToken)
    {
        var item = await speakingRequests.RequestInformationAsync(
            KingdomIdentity.HeyyKingTenantId,
            id,
            message,
            cancellationToken);
        if (item is null) return null;
        await ReplaceLatestActorAsync(id, "information-requested", cancellationToken);
        return await speakingRequests.GetAsync(KingdomIdentity.HeyyKingTenantId, id, cancellationToken);
    }

    public async Task<SpeakingRequestDetails?> DeclineAsync(
        Guid id,
        string reason,
        CancellationToken cancellationToken)
    {
        var item = await speakingRequests.DeclineAsync(
            KingdomIdentity.HeyyKingTenantId,
            id,
            reason,
            cancellationToken);
        if (item is null) return null;
        await ReplaceLatestActorAsync(id, "declined", cancellationToken);
        return await speakingRequests.GetAsync(KingdomIdentity.HeyyKingTenantId, id, cancellationToken);
    }

    public async Task<(SpeakingRequestDetails Request, Guid AssignmentId)?> ApproveAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        var request = await requestsDatabase.Requests
            .Include(item => item.Communications)
            .SingleOrDefaultAsync(item =>
                item.TenantId == KingdomIdentity.HeyyKingTenantId && item.Id == id,
                cancellationToken);
        if (request is null) return null;

        if (request.AssignmentId is Guid existingAssignmentId)
        {
            var existing = await speakingRequests.GetAsync(
                KingdomIdentity.HeyyKingTenantId, id, cancellationToken);
            return existing is null ? null : (existing, existingAssignmentId);
        }

        if (request.Status is "approved" or "declined")
            throw new InvalidOperationException(
                $"Request {request.ReferenceNumber} is already {request.Status}.");

        var externalId = $"request:{request.ReferenceNumber}";
        var assignment = await engagementsDatabase.Assignments
            .SingleOrDefaultAsync(item =>
                item.TenantId == KingdomIdentity.HeyyKingTenantId &&
                item.ExternalAssignmentId == externalId,
                cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (assignment is null)
        {
            assignment = new EngagementAssignment
            {
                Id = Guid.NewGuid(),
                TenantId = KingdomIdentity.HeyyKingTenantId,
                ExternalAssignmentId = externalId,
                Title = request.EventName,
                SpeakerName = SpeakerName,
                HostOrganization = request.OrganizationName,
                HostContactName = request.ContactName,
                HostContactEmail = request.ContactEmail,
                Location = BuildLocation(request),
                StartsAtUtc = new DateTimeOffset(
                    request.StartDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero),
                EndsAtUtc = new DateTimeOffset(
                    request.EndDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero),
                Status = "approved",
                TravelStatus = "not-started",
                LodgingStatus = "not-started",
                TransportationStatus = "not-started",
                HostStatus = "in-progress",
                DocumentsStatus = request.AgreementStatus == "signed" ? "received" : "in-progress",
                CloseoutStatus = "not-started",
                Notes = BuildHostSnapshot(request),
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            assignment.Tasks.Add(Task("host", "Complete host coordination", "Itinerant Coordinator", now));
            assignment.Tasks.Add(Task(
                "travel",
                "Confirm travel and lodging plan",
                request.TravelBookedBy == "host" ? "Host Coordinator" : "Itinerant Coordinator",
                now));
            assignment.Tasks.Add(Task(
                "documents",
                "Finalize engagement agreement",
                "Itinerant Coordinator",
                now,
                request.AgreementStatus == "signed" ? "complete" : "open"));
            assignment.Tasks.Add(Task(
                "ministry",
                "Prayerfully prepare assignment and ministry resources",
                "Pastor Hickman / Ministry Team",
                now));
            engagementsDatabase.Assignments.Add(assignment);
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }
        else
        {
            assignment.Title = request.EventName;
            assignment.SpeakerName = SpeakerName;
            assignment.HostOrganization = request.OrganizationName;
            assignment.HostContactName = request.ContactName;
            assignment.HostContactEmail = request.ContactEmail;
            assignment.Location = BuildLocation(request);
            assignment.StartsAtUtc = new DateTimeOffset(
                request.StartDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
            assignment.EndsAtUtc = new DateTimeOffset(
                request.EndDate.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
            assignment.Notes = BuildHostSnapshot(request);
            assignment.UpdatedAtUtc = now;
            await engagementsDatabase.SaveChangesAsync(cancellationToken);
        }

        request.Status = "approved";
        request.AssignmentId = assignment.Id;
        request.EditTokenExpiresAtUtc = null;
        request.UpdatedAtUtc = now;
        request.Communications.Add(new SpeakingRequestCommunicationRecord
        {
            Id = Guid.NewGuid(),
            RequestId = request.Id,
            Type = "approved",
            Message = "The invitation was approved and moved into Pastor Hickman's itinerant ministry preparation.",
            Actor = TeamName,
            CreatedAtUtc = now
        });
        await requestsDatabase.SaveChangesAsync(cancellationToken);

        var mapped = await speakingRequests.GetAsync(
            KingdomIdentity.HeyyKingTenantId, id, cancellationToken);
        return mapped is null ? null : (mapped, assignment.Id);
    }

    private async Task<bool> BelongsToHeyyKingAsync(
        string token,
        CancellationToken cancellationToken)
    {
        await requestsDatabase.EnsureSchemaAsync(cancellationToken);
        return await requestsDatabase.Requests.AsNoTracking().AnyAsync(item =>
            item.TenantId == KingdomIdentity.HeyyKingTenantId &&
            item.EditToken == token,
            cancellationToken);
    }

    private async Task ReplaceLatestActorAsync(
        Guid requestId,
        string communicationType,
        CancellationToken cancellationToken)
    {
        var communication = await requestsDatabase.Communications
            .Where(item => item.RequestId == requestId && item.Type == communicationType)
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (communication is null) return;
        communication.Actor = TeamName;
        await requestsDatabase.SaveChangesAsync(cancellationToken);
    }

    private static EngagementTask Task(
        string category,
        string title,
        string owner,
        DateTimeOffset now,
        string status = "open") => new()
    {
        Id = Guid.NewGuid(),
        Category = category,
        Title = title,
        Owner = owner,
        Status = status,
        UpdatedAtUtc = now
    };

    private static string BuildLocation(SpeakingRequestRecord request)
    {
        var region = string.IsNullOrWhiteSpace(request.State) ? request.Region : request.State;
        return string.Join(", ", new[]
        {
            request.VenueName, request.City, region, request.Country
        }.Where(value => !string.IsNullOrWhiteSpace(value)));
    }

    private static string BuildHostSnapshot(SpeakingRequestRecord request) => $"""
        Pastor Derwin Hickman itinerant invitation {request.ReferenceNumber}
        Host organization: {request.OrganizationName}
        Event: {request.EventName} ({request.EventType})
        Requested ministry: {request.MinistryRequest}
        Dates: {request.StartDate:yyyy-MM-dd} through {request.EndDate:yyyy-MM-dd}
        Venue: {request.VenueName}, {request.VenueAddress}
        Location: {BuildLocation(request)}
        Region / time zone: {request.Region ?? "Not provided"} / {request.TimeZone}
        Primary contact: {request.ContactName} | {request.ContactEmail} | {request.ContactPhone}
        Expected attendance: {request.ExpectedAttendance}
        Travel coverage: {request.TravelCoverageStatus}
        Lodging coverage: {request.LodgingCoverageStatus}
        Travel booked by: {request.TravelBookedBy}
        Honorarium: {request.HonorariumStatus} | {request.HonorariumCurrency} {request.HonorariumAmount:0.00}
        Payment status: {request.PaymentStatus}
        Agreement status: {request.AgreementStatus}
        Engagement status: {request.EngagementStatus}
        Host readiness: {request.ReadinessPercentage}%
        """;
}

public static class HickmanSpeakingRequestEndpoints
{
    public static IEndpointRouteBuilder MapHickmanSpeakingRequestEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/public/engagements/hickman-requests")
            .AllowAnonymous();

        group.MapPost("", async (
            SpeakingRequestInput request,
            HickmanSpeakingRequestsService service,
            CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CreateAsync(request, ct)); }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["request"] = [exception.Message]
                });
            }
        });

        group.MapGet("/{token}", async (
            string token,
            HickmanSpeakingRequestsService service,
            CancellationToken ct) =>
        {
            var item = await service.GetForHostAsync(token, ct);
            return item is null
                ? Results.NotFound(new
                {
                    message = "This Pastor Hickman host update link is invalid, expired, or no longer needed."
                })
                : Results.Ok(item);
        });

        group.MapPut("/{token}", async (
            string token,
            HostSpeakingRequestUpdate request,
            HickmanSpeakingRequestsService service,
            CancellationToken ct) =>
        {
            try
            {
                var item = await service.SubmitHostResponseAsync(token, request, ct);
                return item is null
                    ? Results.NotFound(new
                    {
                        message = "This Pastor Hickman host update link is invalid, expired, or no longer needed."
                    })
                    : Results.Ok(item);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["request"] = [exception.Message]
                });
            }
        });

        return endpoints;
    }
}

/// <summary>
/// The existing invitation-review Angular screen intentionally stays shared. For
/// Heyy King only, intercept its mutation routes so the same screen uses Pastor
/// Hickman's tenant-aware review behavior and generates Hickman host-update URLs.
/// </summary>
public sealed class HickmanSpeakingRequestReviewMiddleware(RequestDelegate next)
{
    private static readonly Regex ReviewPath = new(
        "^/api/engagements/requests/(?<id>[0-9a-fA-F-]{36})/(?<action>request-information|decline|approve)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public async Task InvokeAsync(
        HttpContext context,
        HickmanSpeakingRequestsService service)
    {
        if (!HttpMethods.IsPost(context.Request.Method) ||
            KingdomIdentity.TenantId(context.User, context.Request) != KingdomIdentity.HeyyKingTenantId)
        {
            await next(context);
            return;
        }

        var match = ReviewPath.Match(context.Request.Path.Value ?? string.Empty);
        if (!match.Success || !Guid.TryParse(match.Groups["id"].Value, out var id))
        {
            await next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true ||
            !KingdomIdentity.CanWriteEngagements(context.User))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Engagements write access is required to review Pastor Hickman invitations."
            });
            return;
        }

        try
        {
            switch (match.Groups["action"].Value.ToLowerInvariant())
            {
                case "request-information":
                {
                    var body = await context.Request.ReadFromJsonAsync<ReviewMessageRequest>(
                        cancellationToken: context.RequestAborted);
                    if (body is null)
                    {
                        context.Response.StatusCode = StatusCodes.Status400BadRequest;
                        return;
                    }
                    var item = await service.RequestInformationAsync(
                        id, body.Message, context.RequestAborted);
                    if (item is null)
                    {
                        context.Response.StatusCode = StatusCodes.Status404NotFound;
                        return;
                    }
                    var editUrl = $"{context.Request.Scheme}://{context.Request.Host}/invite/pastor-hickman/requests/{item.EditToken}";
                    await context.Response.WriteAsJsonAsync(new { request = item, editUrl });
                    return;
                }
                case "decline":
                {
                    var body = await context.Request.ReadFromJsonAsync<DeclineSpeakingRequest>(
                        cancellationToken: context.RequestAborted);
                    if (body is null)
                    {
                        context.Response.StatusCode = StatusCodes.Status400BadRequest;
                        return;
                    }
                    var item = await service.DeclineAsync(id, body.Reason, context.RequestAborted);
                    if (item is null)
                    {
                        context.Response.StatusCode = StatusCodes.Status404NotFound;
                        return;
                    }
                    await context.Response.WriteAsJsonAsync(item);
                    return;
                }
                case "approve":
                {
                    var result = await service.ApproveAsync(id, context.RequestAborted);
                    if (result is null)
                    {
                        context.Response.StatusCode = StatusCodes.Status404NotFound;
                        return;
                    }
                    await context.Response.WriteAsJsonAsync(new
                    {
                        request = result.Value.Request,
                        assignmentId = result.Value.AssignmentId
                    });
                    return;
                }
            }
        }
        catch (ArgumentException exception)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = exception.Message });
            return;
        }
        catch (InvalidOperationException exception)
        {
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            await context.Response.WriteAsJsonAsync(new { message = exception.Message });
            return;
        }

        await next(context);
    }
}
