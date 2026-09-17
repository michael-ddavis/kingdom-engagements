using System.Net.Http.Json;
using KingdomEngagements.Web.Features;

namespace KingdomEngagements.Web.Platform;

public sealed class EngagementCareHandoffPublisher(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IntegrationServiceCredentials credentials)
{
    public async Task PublishAsync(
        EngagementAssignment assignment,
        MinistryResponseRecord response,
        CancellationToken cancellationToken)
    {
        var occurredAtUtc = DateTimeOffset.UtcNow;
        var sourceUrl = configuration["KingdomOS:EngagementsBrowserUrl"]
            ?? "http://localhost:5110/#assignments";
        var envelope = new
        {
            eventId = response.Id,
            eventName = "ResponseHandoffCreated",
            eventVersion = 1,
            occurredAtUtc,
            tenantId = assignment.TenantId,
            correlationId = $"engagement:{assignment.Id:N}:response:{response.Id:N}",
            producer = "kingdom-engagements",
            classification = "Confidential",
            data = new
            {
                subjectId = $"engagement-response:{response.Id:N}",
                assignmentId = assignment.Id,
                responseId = response.Id,
                assignmentTitle = assignment.Title,
                responseType = response.Type,
                personName = response.PersonName,
                email = response.Email,
                phone = response.Phone,
                notes = response.Notes,
                followUpDueAtUtc = response.FollowUpDueAtUtc,
                consentConfirmed = true,
                sourceUrl
            }
        };

        var careUrl = (configuration["KingdomOS:CareInternalUrl"] ?? "http://care:8080")
            .TrimEnd('/');
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{careUrl}/api/integration/events")
        {
            Content = JsonContent.Create(envelope)
        };
        request.Headers.TryAddWithoutValidation(
            "X-Kingdom-Service-Key",
            credentials.ServiceKey);

        var client = httpClientFactory.CreateClient();
        using var responseMessage = await client.SendAsync(request, cancellationToken);
        responseMessage.EnsureSuccessStatusCode();
    }
}
