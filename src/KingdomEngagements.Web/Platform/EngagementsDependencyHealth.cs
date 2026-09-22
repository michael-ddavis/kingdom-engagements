using System.Diagnostics;
using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace KingdomEngagements.Web.Platform;

public sealed record EngagementsDependencyStatus(
    string Name,
    string Status,
    double DurationMs)
{
    public bool Healthy =>
        Status.Equals("healthy", StringComparison.OrdinalIgnoreCase) ||
        Status.Equals("not-configured", StringComparison.OrdinalIgnoreCase);
}

public sealed class EngagementsDependencyHealth(
    IServiceScopeFactory scopeFactory,
    IServiceProvider services,
    IEngagementDocumentStorage documentStorage,
    EngagementsEntitlementResolver entitlements,
    IConfiguration configuration,
    ILogger<EngagementsDependencyHealth> logger)
{
    public async Task<IReadOnlyList<EngagementsDependencyStatus>> CheckAsync(
        CancellationToken cancellationToken)
    {
        var results = new List<EngagementsDependencyStatus>
        {
            await CheckDatabaseAsync(cancellationToken),
            await CheckRedisAsync(cancellationToken),
            await CheckObjectStorageAsync(cancellationToken),
            await CheckPlatformEntitlementAsync(cancellationToken)
        };

        return results;
    }

    private async Task<EngagementsDependencyStatus> CheckDatabaseAsync(
        CancellationToken cancellationToken)
    {
        return await CheckAsync(
            "database",
            async () =>
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var database = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();

                if (database.Database.IsRelational() &&
                    !await database.Database.CanConnectAsync(cancellationToken))
                {
                    throw new InvalidOperationException("Database connection check returned false.");
                }
            });
    }

    private async Task<EngagementsDependencyStatus> CheckRedisAsync(
        CancellationToken cancellationToken)
    {
        var redis = services.GetService<IConnectionMultiplexer>();
        var requireRedis =
            configuration.GetValue("KingdomOS:DistributedRuntime:RequireRedis", false);

        if (redis is null)
        {
            return requireRedis
                ? new EngagementsDependencyStatus("redis", "unhealthy", 0)
                : new EngagementsDependencyStatus("redis", "not-configured", 0);
        }

        return await CheckAsync(
            "redis",
            async () =>
            {
                cancellationToken.ThrowIfCancellationRequested();
                await redis.GetDatabase().PingAsync();
            });
    }

    private async Task<EngagementsDependencyStatus> CheckObjectStorageAsync(
        CancellationToken cancellationToken)
    {
        return await CheckAsync(
            "object-storage",
            () => documentStorage.CheckHealthAsync(cancellationToken));
    }

    private async Task<EngagementsDependencyStatus> CheckPlatformEntitlementAsync(
        CancellationToken cancellationToken)
    {
        var started = Stopwatch.GetTimestamp();

        try
        {
            var state = await entitlements.GetStateAsync(
                KingdomIdentity.DemoTenantId,
                cancellationToken);

            var healthy = state == ModuleEntitlementState.Enabled;
            var elapsed = Stopwatch.GetElapsedTime(started);
            ApostolOSObservability.RecordDependency(
                "platform-entitlement",
                healthy,
                elapsed);

            return new EngagementsDependencyStatus(
                "platform-entitlement",
                healthy ? "healthy" : "unhealthy",
                elapsed.TotalMilliseconds);
        }
        catch (Exception exception)
        {
            var elapsed = Stopwatch.GetElapsedTime(started);
            ApostolOSObservability.RecordDependency(
                "platform-entitlement",
                false,
                elapsed);

            logger.LogError(
                exception,
                "Dependency readiness check failed for {Dependency}.",
                "platform-entitlement");

            return new EngagementsDependencyStatus(
                "platform-entitlement",
                "unhealthy",
                elapsed.TotalMilliseconds);
        }
    }

    private async Task<EngagementsDependencyStatus> CheckAsync(
        string name,
        Func<Task> check)
    {
        var started = Stopwatch.GetTimestamp();

        try
        {
            await check();
            var elapsed = Stopwatch.GetElapsedTime(started);
            ApostolOSObservability.RecordDependency(name, true, elapsed);

            return new EngagementsDependencyStatus(
                name,
                "healthy",
                elapsed.TotalMilliseconds);
        }
        catch (Exception exception)
        {
            var elapsed = Stopwatch.GetElapsedTime(started);
            ApostolOSObservability.RecordDependency(name, false, elapsed);

            logger.LogError(
                exception,
                "Dependency readiness check failed for {Dependency}.",
                name);

            return new EngagementsDependencyStatus(
                name,
                "unhealthy",
                elapsed.TotalMilliseconds);
        }
    }
}
