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
    private const string ConnectedAssignment = "assignment-demo-001";
    private static readonly string[] RetainedAssignments =
    [
        "assignment-demo-001",
        "assignment-demo-002",
        "assignment-demo-007"
    ];

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
                var engagements = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                var requests = scope.ServiceProvider.GetRequiredService<SpeakingRequestsDbContext>();
                var preparations = scope.ServiceProvider.GetRequiredService<EngagementPreparationDbContext>();
                var activities = scope.ServiceProvider.GetRequiredService<AssignmentWorkspaceDbContext>();
                var completion = scope.ServiceProvider.GetRequiredService<EngagementCompletionDbContext>();
                var publisher = scope.ServiceProvider.GetRequiredService<EngagementOperationsCoordinationPublisher>();

                await requests.EnsureSchemaAsync(stoppingToken);
                await preparations.EnsureSchemaAsync(stoppingToken);
                await activities.EnsureSchemaAsync(stoppingToken);
                await completion.EnsureSchemaAsync(stoppingToken);

                var assignment = await engagements.Assignments.AsNoTracking()
                    .SingleOrDefaultAsync(item =>
                        item.TenantId == KingdomIdentity.DemoTenantId &&
                        item.ExternalAssignmentId == ConnectedAssignment,
                        stoppingToken);
                if (assignment is null)
                {
                    await DelayAsync(attempt, stoppingToken);
                    continue;
                }

                // The seed and depth workers start together. Run several cleanup passes so an
                // existing database cannot retain old hidden demo rows or auxiliary records that
                // one of those workers was already in the process of touching during startup.
                for (var pass = 0; pass < 4; pass++)
                {
                    await RemoveRetiredSourceRowsAsync(engagements, requests, stoppingToken);
                    await RemoveRetiredAuxiliaryRowsAsync(
                        engagements,
                        preparations,
                        activities,
                        completion,
                        stoppingToken);
                    if (pass < 3) await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }

                assignment = await engagements.Assignments.AsNoTracking()
                    .SingleAsync(item =>
                        item.TenantId == KingdomIdentity.DemoTenantId &&
                        item.ExternalAssignmentId == ConnectedAssignment,
                        stoppingToken);

                // Publish from the authoritative assignment itself. The focused demo no longer
                // needs a hidden approved speaking request just to manufacture the Operations story.
                await publisher.PublishAsync(assignment, stoppingToken);
                logger.LogInformation(
                    "Focused Engagements demo cleanup and connected Operations story are ready for {AssignmentTitle}.",
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
                    "Focused Engagements demo cleanup attempt {Attempt} is waiting for startup dependencies.",
                    attempt);
                await DelayAsync(attempt, stoppingToken);
            }
        }

        logger.LogWarning(
            "Focused Engagements demo cleanup could not finish during startup. The authoritative Engagements records remain available.");
    }

    private static async Task RemoveRetiredSourceRowsAsync(
        EngagementsDbContext engagements,
        SpeakingRequestsDbContext requests,
        CancellationToken cancellationToken)
    {
        var retiredRequests = await requests.Requests
            .Include(item => item.Communications)
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                ((item.ReferenceNumber.StartsWith("CTG-DEMO-") && item.ReferenceNumber != "CTG-DEMO-001") ||
                 item.EventName.StartsWith("Demo-lock Engagement") ||
                 item.OrganizationName == "Demo-lock Covenant Fellowship"))
            .ToListAsync(cancellationToken);
        if (retiredRequests.Count > 0)
        {
            requests.Requests.RemoveRange(retiredRequests);
            await requests.SaveChangesAsync(cancellationToken);
        }

        var retiredAssignments = await engagements.Assignments
            .Include(item => item.Tasks)
            .Include(item => item.Documents)
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                ((item.ExternalAssignmentId.StartsWith("assignment-demo-") && !RetainedAssignments.Contains(item.ExternalAssignmentId)) ||
                 item.Title.StartsWith("Demo-lock Engagement") ||
                 item.HostOrganization == "Demo-lock Covenant Fellowship"))
            .ToListAsync(cancellationToken);
        if (retiredAssignments.Count > 0)
        {
            engagements.Assignments.RemoveRange(retiredAssignments);
            await engagements.SaveChangesAsync(cancellationToken);
        }
    }

    private static async Task RemoveRetiredAuxiliaryRowsAsync(
        EngagementsDbContext engagements,
        EngagementPreparationDbContext preparations,
        AssignmentWorkspaceDbContext activities,
        EngagementCompletionDbContext completion,
        CancellationToken cancellationToken)
    {
        var retainedAssignments = await engagements.Assignments.AsNoTracking()
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                RetainedAssignments.Contains(item.ExternalAssignmentId))
            .Select(item => new { item.Id, item.ExternalAssignmentId })
            .ToListAsync(cancellationToken);
        var retainedIds = retainedAssignments.Select(item => item.Id).ToHashSet();
        var retainedById = retainedAssignments.ToDictionary(item => item.Id, item => item.ExternalAssignmentId);

        var demoPreparations = await preparations.Preparations
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                (item.ReferenceNumber.StartsWith("CTG-DEMO-") || item.ReferenceNumber.StartsWith("CTG-ASSIGN-")))
            .ToListAsync(cancellationToken);

        var retiredPreparations = demoPreparations
            .Where(item => !retainedIds.Contains(item.AssignmentId))
            .ToList();
        var retiredAssignmentIds = retiredPreparations
            .Select(item => item.AssignmentId)
            .Distinct()
            .ToArray();
        var retiredPreparationIds = retiredPreparations
            .Select(item => item.Id)
            .ToArray();

        if (retiredPreparationIds.Length > 0)
        {
            var documents = await preparations.Documents
                .Where(item => retiredPreparationIds.Contains(item.PreparationId))
                .ToListAsync(cancellationToken);
            preparations.Documents.RemoveRange(documents);
            preparations.Preparations.RemoveRange(retiredPreparations);
        }

        // Old focused-demo assignments were previously backed by hidden CTG-DEMO requests.
        // Break that historical coupling so the retained assignment workspaces stand on their own.
        foreach (var preparation in demoPreparations.Where(item => retainedIds.Contains(item.AssignmentId)))
        {
            if (!preparation.ReferenceNumber.StartsWith("CTG-DEMO-", StringComparison.OrdinalIgnoreCase)) continue;
            if (!retainedById.TryGetValue(preparation.AssignmentId, out var externalId)) continue;
            var suffix = externalId.Replace("assignment-demo-", string.Empty, StringComparison.OrdinalIgnoreCase);
            preparation.RequestId = Guid.NewGuid();
            preparation.ReferenceNumber = $"CTG-ASSIGN-{suffix}";
        }

        await preparations.SaveChangesAsync(cancellationToken);

        if (retiredAssignmentIds.Length == 0) return;

        var retiredActivities = await activities.Activities
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                retiredAssignmentIds.Contains(item.AssignmentId))
            .ToListAsync(cancellationToken);
        activities.Activities.RemoveRange(retiredActivities);
        await activities.SaveChangesAsync(cancellationToken);

        var retiredResponses = await completion.Responses
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                retiredAssignmentIds.Contains(item.AssignmentId))
            .ToListAsync(cancellationToken);
        var retiredCloseouts = await completion.Closeouts
            .Where(item =>
                item.TenantId == KingdomIdentity.DemoTenantId &&
                retiredAssignmentIds.Contains(item.AssignmentId))
            .ToListAsync(cancellationToken);
        completion.Responses.RemoveRange(retiredResponses);
        completion.Closeouts.RemoveRange(retiredCloseouts);
        await completion.SaveChangesAsync(cancellationToken);
    }

    private static Task DelayAsync(int attempt, CancellationToken cancellationToken) =>
        Task.Delay(TimeSpan.FromSeconds(Math.Min(10, Math.Max(2, attempt))), cancellationToken);
}
