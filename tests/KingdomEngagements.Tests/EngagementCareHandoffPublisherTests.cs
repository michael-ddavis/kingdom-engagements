using System.Net;
using System.Text.Json;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

public sealed class EngagementCareHandoffPublisherTests
{
    [Fact]
    public async Task Publishes_an_idempotent_consented_response_handoff_to_care()
    {
        var handler = new RecordingHandler();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:CareInternalUrl"] = "http://care.test",
                ["KingdomOS:Integration:ServiceKey"] = "test-key",
                ["KingdomOS:EngagementsBrowserUrl"] = "http://engagements.test/#assignments"
            })
            .Build();
        var publisher = new EngagementCareHandoffPublisher(
            new TestHttpClientFactory(new HttpClient(handler)),
            configuration);
        var tenantId = Guid.NewGuid();
        var assignmentId = Guid.NewGuid();
        var responseId = Guid.NewGuid();

        await publisher.PublishAsync(
            new EngagementAssignment
            {
                Id = assignmentId,
                TenantId = tenantId,
                Title = "Community worship night"
            },
            new MinistryResponseRecord
            {
                Id = responseId,
                TenantId = tenantId,
                AssignmentId = assignmentId,
                Type = "pastoral-follow-up",
                PersonName = "Consent Test",
                Email = "consent@example.test",
                RequiresFollowUp = true
            },
            CancellationToken.None);

        Assert.Equal("http://care.test/api/integration/events", handler.RequestUri?.ToString());
        Assert.Equal("test-key", handler.ServiceKey);
        using var payload = JsonDocument.Parse(handler.Body!);
        Assert.Equal("ResponseHandoffCreated", payload.RootElement.GetProperty("eventName").GetString());
        Assert.Equal(responseId, payload.RootElement.GetProperty("eventId").GetGuid());
        Assert.Equal("Confidential", payload.RootElement.GetProperty("classification").GetString());
        var data = payload.RootElement.GetProperty("data");
        Assert.True(data.GetProperty("consentConfirmed").GetBoolean());
        Assert.Equal("Consent Test", data.GetProperty("personName").GetString());
        Assert.Equal($"engagement-response:{responseId:N}", data.GetProperty("subjectId").GetString());
    }

    private sealed class TestHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }
        public string? ServiceKey { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            ServiceKey = request.Headers.GetValues("X-Kingdom-Service-Key").Single();
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
