using System.Net;
using System.Text.Json;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.Extensions.Configuration;

namespace KingdomEngagements.Tests;

public sealed class EngagementOperationsCoordinationPublisherTests
{
    [Fact]
    public async Task PublishesTheExistingOperationalDependencyContractToOperationsAndPlatform()
    {
        var handler = new RecordingHandler();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:OperationsUrl"] = "http://operations.test",
                ["KingdomOS:PlatformUrl"] = "http://platform.test",
                ["KingdomOS:Integration:ServiceKey"] = "test-key",
                ["KingdomOS:EngagementsBrowserUrl"] = "https://engagements.test"
            })
            .Build();
        var publisher = new EngagementOperationsCoordinationPublisher(
            new TestHttpClientFactory(new HttpClient(handler)),
            configuration);
        var tenantId = Guid.NewGuid();
        var assignmentId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var startsAtUtc = new DateTimeOffset(2027, 3, 18, 13, 0, 0, TimeSpan.Zero);

        await publisher.PublishAsync(
            new SpeakingRequestRecord
            {
                Id = requestId,
                ReferenceNumber = "CTG-270318-TEST"
            },
            new EngagementAssignment
            {
                Id = assignmentId,
                TenantId = tenantId,
                Title = "Apostolic Leadership Intensive",
                SpeakerName = "Cynthia Thompson",
                HostOrganization = "Covenant Fellowship",
                Location = "Atlanta, Georgia",
                StartsAtUtc = startsAtUtc,
                EndsAtUtc = startsAtUtc.AddDays(2)
            },
            CancellationToken.None);

        Assert.Equal(
            new[]
            {
                "http://operations.test/api/integration/events",
                "http://platform.test/api/integration/events"
            },
            handler.Requests.Select(request => request.Uri).ToArray());
        Assert.All(handler.Requests, request => Assert.Equal("test-key", request.ServiceKey));
        Assert.Equal(handler.Requests[0].Body, handler.Requests[1].Body);

        using var payload = JsonDocument.Parse(handler.Requests[0].Body);
        var root = payload.RootElement;
        Assert.Equal(assignmentId, root.GetProperty("eventId").GetGuid());
        Assert.Equal("OperationalDependencyCreated", root.GetProperty("eventName").GetString());
        Assert.Equal(1, root.GetProperty("eventVersion").GetInt32());
        Assert.Equal(tenantId, root.GetProperty("tenantId").GetGuid());
        Assert.Equal($"engagement:{assignmentId:N}", root.GetProperty("correlationId").GetString());
        Assert.Equal("kingdom-engagements", root.GetProperty("producer").GetString());
        Assert.Equal("Internal", root.GetProperty("classification").GetString());

        var data = root.GetProperty("data");
        Assert.Equal($"assignment:{assignmentId:N}", data.GetProperty("subjectId").GetString());
        Assert.Equal(assignmentId, data.GetProperty("assignmentId").GetGuid());
        Assert.Equal(requestId, data.GetProperty("requestId").GetGuid());
        Assert.Equal("CTG-270318-TEST", data.GetProperty("referenceNumber").GetString());
        Assert.Equal(
            $"https://engagements.test/assignments/{assignmentId}",
            data.GetProperty("sourceUrl").GetString());

        var work = data.GetProperty("work").EnumerateArray().ToArray();
        Assert.Equal(5, work.Length);
        Assert.Contains(work, item =>
            item.GetProperty("ministry").GetString() == "Hospitality" &&
            item.GetProperty("kind").GetString() == "calendar-event");
        Assert.Contains(work, item =>
            item.GetProperty("ministry").GetString() == "Hospitality" &&
            item.GetProperty("kind").GetString() == "checklist");
        Assert.Contains(work, item =>
            item.GetProperty("ministry").GetString() == "Media & Communications");
        Assert.Contains(work, item =>
            item.GetProperty("ministry").GetString() == "Intercessory Prayer");
    }

    private sealed class TestHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<RecordedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(new RecordedRequest(
                request.RequestUri!.ToString(),
                request.Headers.GetValues("X-Kingdom-Service-Key").Single(),
                await request.Content!.ReadAsStringAsync(cancellationToken)));
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private sealed record RecordedRequest(string Uri, string ServiceKey, string Body);
}
