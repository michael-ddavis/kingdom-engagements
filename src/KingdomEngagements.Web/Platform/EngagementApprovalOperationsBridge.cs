using System.Net.Http.Json;
using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Platform;

public sealed class EngagementOperationsCoordinationPublisher(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration)
{
    public async Task PublishAsync(
        SpeakingRequestRecord request,
        EngagementAssignment assignment,
        CancellationToken cancellationToken)
    {
        var eventId = assignment.Id;
        var occurredAtUtc = DateTimeOffset.UtcNow;
        var sourceUrl = configuration["KingdomOS:EngagementsBrowserUrl"]
            ?? "http://localhost:5110/#assignments";
        var eventDate = assignment.StartsAtUtc;
        var eventEnd = assignment.EndsAtUtc;

        var envelope = new
        {
            eventId,
            eventName = "OperationalDependencyCreated",
            eventVersion = 1,
            occurredAtUtc,
            tenantId = assignment.TenantId,
            correlationId = $"engagement:{assignment.Id:N}",
            producer = "kingdom-engagements",
            classification = "Internal",
            data = new
            {
                subjectId = $"assignment:{assignment.Id:N}",
                assignmentId = assignment.Id,
                requestId = request.Id,
                referenceNumber = request.ReferenceNumber,
                title = assignment.Title,
                hostOrganization = assignment.HostOrganization,
                location = assignment.Location,
                startsAtUtc = eventDate,
                endsAtUtc = eventEnd,
                sourceUrl,
                work = new object[]
                {
                    new
                    {
                        ministry = "Hospitality",
                        kind = "calendar-event",
                        title = $"Coordinate {assignment.Title}",
                        summary = $"Internal coordination for {assignment.SpeakerName} with {assignment.HostOrganization}{LocationSuffix(assignment.Location)}.",
                        startsAtUtc = eventDate,
                        dueAtUtc = eventEnd ?? eventDate
                    },
                    new
                    {
                        ministry = "Hospitality",
                        kind = "checklist",
                        title = $"{assignment.Title} coordination checklist",
                        summary = "Shared internal readiness for the approved engagement. Engagements remains the authoritative assignment record.",
                        startsAtUtc = eventDate?.AddDays(-21),
                        dueAtUtc = eventDate?.AddDays(-1),
                        steps = new[]
                        {
                            "Confirm travel itinerary and lodging",
                            "Confirm ground transportation and arrival contact",
                            "Confirm final host schedule and ministry expectations",
                            "Confirm communications and approved promotional assets",
                            "Confirm prayer covering and ministry preparation",
                            "Complete final Operations readiness review"
                        }
                    },
                    new
                    {
                        ministry = "Hospitality",
                        kind = "support-request",
                        title = $"Confirm travel and lodging for {assignment.Title}",
                        summary = "Verify itinerary, lodging, ground transportation, arrival details, and the internal point of contact.",
                        startsAtUtc = (DateTimeOffset?)null,
                        dueAtUtc = eventDate?.AddDays(-21)
                    },
                    new
                    {
                        ministry = "Media & Communications",
                        kind = "activity",
                        title = $"Prepare communications for {assignment.Title}",
                        summary = "Confirm promotional assets, approved language, publishing deadlines, and any host-facing communication needs.",
                        startsAtUtc = (DateTimeOffset?)null,
                        dueAtUtc = eventDate?.AddDays(-14)
                    },
                    new
                    {
                        ministry = "Intercessory Prayer",
                        kind = "activity",
                        title = $"Prepare prayer covering for {assignment.Title}",
                        summary = "Review the assignment, ministry focus, host context, and prayer needs before the engagement.",
                        startsAtUtc = (DateTimeOffset?)null,
                        dueAtUtc = eventDate?.AddDays(-7)
                    }
                }
            }
        };

        var client = httpClientFactory.CreateClient();
        var platformUrl = (configuration["KingdomOS:PlatformUrl"] ?? "http://platform:8080").TrimEnd('/');
        var operationsUrl = (configuration["KingdomOS:OperationsUrl"] ?? "http://operations:8080").TrimEnd('/');
        var serviceKey = configuration["KingdomOS:Integration:ServiceKey"]
            ?? "local-kingdomos-integration";

        using (var operationsRequest = new HttpRequestMessage(
                   HttpMethod.Post,
                   $"{operationsUrl}/api/integration/events")
               {
                   Content = JsonContent.Create(envelope)
               })
        {
            operationsRequest.Headers.TryAddWithoutValidation("X-Kingdom-Service-Key", serviceKey);
            using var operationsResponse = await client.SendAsync(operationsRequest, cancellationToken);
            operationsResponse.EnsureSuccessStatusCode();
        }

        using var platformResponse = await client.PostAsJsonAsync(
            $"{platformUrl}/api/integration/events",
            envelope,
            cancellationToken);
        platformResponse.EnsureSuccessStatusCode();
    }

    private static string LocationSuffix(string? location) =>
        string.IsNullOrWhiteSpace(location) ? string.Empty : $" in {location.Trim()}";
}

public sealed class EngagementApprovalOperationsBridge(
    RequestDelegate next,
    ILogger<EngagementApprovalOperationsBridge> logger)
{
    private const string ApprovalPrefix = "/api/engagements/requests/";
    private const string ApprovalSuffix = "/approve";

    public async Task InvokeAsync(
        HttpContext context,
        SpeakingRequestsDbContext speakingRequests,
        EngagementsDbContext engagements,
        EngagementOperationsCoordinationPublisher publisher)
    {
        var requestId = ApprovalRequestId(context.Request);
        await next(context);

        if (requestId is null || context.Response.StatusCode is < 200 or >= 300)
            return;

        try
        {
            var request = await speakingRequests.Requests.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == requestId.Value, context.RequestAborted);
            if (request?.AssignmentId is not Guid assignmentId) return;

            var assignment = await engagements.Assignments.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == assignmentId, context.RequestAborted);
            if (assignment is null) return;

            await publisher.PublishAsync(request, assignment, context.RequestAborted);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // The approved assignment is authoritative and must never be rolled back because a
            // secondary coordination handoff is temporarily unavailable.
            logger.LogWarning(
                exception,
                "Approved engagement request {RequestId} could not publish its Operations coordination handoff yet.",
                requestId);
        }
    }

    private static Guid? ApprovalRequestId(HttpRequest request)
    {
        if (!HttpMethods.IsPost(request.Method)) return null;
        var path = request.Path.Value ?? string.Empty;
        if (!path.StartsWith(ApprovalPrefix, StringComparison.OrdinalIgnoreCase) ||
            !path.EndsWith(ApprovalSuffix, StringComparison.OrdinalIgnoreCase))
            return null;

        var id = path[ApprovalPrefix.Length..^ApprovalSuffix.Length].Trim('/');
        return Guid.TryParse(id, out var parsed) ? parsed : null;
    }
}