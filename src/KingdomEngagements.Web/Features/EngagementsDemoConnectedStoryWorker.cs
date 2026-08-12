using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementsDemoConnectedStoryWorker(
    IServiceScopeFactory scopeFactory,
    EngagementsStartupState startup,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    ILogger<EngagementsDemoConnectedStoryWorker> logger) : BackgroundService
{
    private const string StoryReference = "CTG-DEMO-003";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!environment.IsDevelopment() || !configuration.GetValue("KingdomOS:DemoData:Enabled", true))
            return;

        while (!stoppingToken.IsCancellationRequested && !startup.Ready)
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        for (var attempt = 1; attempt <= 30 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var requests = scope.ServiceProvider.GetRequiredService<SpeakingRequestsDbContext>();
                var engagements = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                var publisher = scope.ServiceProvider.GetRequiredService<EngagementOperationsCoordinationPublisher>();

                await requests.EnsureSchemaAsync(stoppingToken);
                var request = await requests.Requests.AsNoTracking()
                    .SingleOrDefaultAsync(item =>
                        item.TenantId == KingdomIdentity.DemoTenantId &&
                        item.ReferenceNumber == StoryReference &&
                        item.Status == "approved",
                        stoppingToken);

                if (request?.AssignmentId is not Guid assignmentId)
                {
                    await DelayAsync(attempt, stoppingToken);
                    continue;
                }

                var assignment = await engagements.Assignments.AsNoTracking()
                    .SingleOrDefaultAsync(item =>
                        item.Id == assignmentId &&
                        item.TenantId == KingdomIdentity.DemoTenantId,
                        stoppingToken);
                if (assignment is null)
                {
                    await DelayAsync(attempt, stoppingToken);
                    continue;
                }

                // This is the same source-owned event used by the real approval mutation.
                // Its event ID is the assignment ID, so replaying it at startup is idempotent
                // and repairs an existing demo database without creating a second assignment.
                await publisher.PublishAsync(request, assignment, stoppingToken);
                logger.LogInformation(
                    "Connected CTG demo story is ready for engagement {ReferenceNumber} / {AssignmentTitle}.",
                    request.ReferenceNumber,
                    assignment.Title);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogDebug(
                    exception,
                    "Connected Engagements demo story attempt {Attempt} is waiting for Platform/Operations readiness.",
                    attempt);
                await DelayAsync(attempt, stoppingToken);
            }
        }

        logger.LogWarning(
            "Connected Engagements demo story could not be replayed after startup. The authoritative Engagements records remain available.");
    }

    private static Task DelayAsync(int attempt, CancellationToken cancellationToken) =>
        Task.Delay(TimeSpan.FromSeconds(Math.Min(10, Math.Max(2, attempt))), cancellationToken);
}