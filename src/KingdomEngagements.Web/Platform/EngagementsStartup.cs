using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Platform;

public sealed class EngagementsStartupState
{
    private readonly object sync = new();
    private bool ready;
    private string phase = "starting";
    private string? problem;
    private DateTimeOffset updatedAtUtc = DateTimeOffset.UtcNow;

    public bool Ready
    {
        get
        {
            lock (sync)
                return ready;
        }
    }

    public (bool Ready, string Phase, string? Problem, DateTimeOffset UpdatedAtUtc) Snapshot()
    {
        lock (sync)
            return (ready, phase, problem, updatedAtUtc);
    }

    public void MarkAttempt(string nextPhase)
    {
        lock (sync)
        {
            ready = false;
            phase = nextPhase;
            problem = null;
            updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void MarkReady()
    {
        lock (sync)
        {
            ready = true;
            phase = "ready";
            problem = null;
            updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void MarkFailure(Exception exception)
    {
        lock (sync)
        {
            ready = false;
            phase = "initialization-failed";
            problem = Describe(exception);
            updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    private static string Describe(Exception exception)
    {
        var current = exception;
        while (current.InnerException is not null)
            current = current.InnerException;
        return $"{current.GetType().Name}: {current.Message}";
    }
}

public sealed class EngagementsStartupWorker(
    IServiceScopeFactory scopeFactory,
    EngagementsStartupState state,
    ILogger<EngagementsStartupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var attempt = 0;
        while (!stoppingToken.IsCancellationRequested && !state.Ready)
        {
            attempt++;
            state.MarkAttempt(attempt == 1 ? "initializing" : "retrying-initialization");
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var initializer = scope.ServiceProvider.GetRequiredService<EngagementsInitializer>();
                await initializer.InitializeAsync(stoppingToken);
                state.MarkReady();
                logger.LogInformation("Kingdom Engagements initialization completed on attempt {Attempt}.", attempt);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                state.MarkFailure(exception);
                var delay = TimeSpan.FromSeconds(Math.Min(30, Math.Max(2, attempt * 2)));
                logger.LogError(exception,
                    "Kingdom Engagements initialization attempt {Attempt} failed. Retrying in {DelaySeconds} seconds.",
                    attempt,
                    delay.TotalSeconds);
                await Task.Delay(delay, stoppingToken);
            }
        }
    }
}

public sealed class EngagementsReadinessMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        EngagementsStartupState startup,
        IWebHostEnvironment environment)
    {
        if (!RequiresReadyProduct(context.Request.Path) || startup.Ready)
        {
            await next(context);
            return;
        }

        var snapshot = startup.Snapshot();
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new
        {
            module = "engagements",
            status = "Starting",
            phase = snapshot.Phase,
            problem = environment.IsDevelopment() ? snapshot.Problem : null,
            message = "Kingdom Engagements is still preparing its runtime dependencies. It will retry automatically."
        });
    }

    private static bool RequiresReadyProduct(PathString path) =>
        path.StartsWithSegments("/api/engagements") ||
        path.StartsWithSegments("/api/integration/events");
}

public static class EngagementsHealthEndpoints
{
    public static IEndpointRouteBuilder MapEngagementsHealth(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/health/live", () => Results.Ok(new
        {
            status = "Alive",
            service = "KingdomEngagements",
            module = "engagements"
        })).AllowAnonymous();

        endpoints.MapGet("/health", ReadyAsync).AllowAnonymous();
        endpoints.MapGet("/health/ready", ReadyAsync).AllowAnonymous();

        return endpoints;
    }

    private static async Task<IResult> ReadyAsync(
        EngagementsStartupState startup,
        EngagementsDependencyHealth dependencies,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var snapshot = startup.Snapshot();
        if (!snapshot.Ready)
        {
            return Results.Json(new
            {
                status = "Starting",
                service = "KingdomEngagements",
                module = "engagements",
                phase = snapshot.Phase,
                problem = environment.IsDevelopment() ? snapshot.Problem : null,
                updatedAtUtc = snapshot.UpdatedAtUtc
            }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        var checks = await dependencies.CheckAsync(cancellationToken);
        var healthy = checks.All(check => check.Healthy);

        var database = checks.Single(check => check.Name == "database");
        var redis = checks.Single(check => check.Name == "redis");
        var objectStorage = checks.Single(check => check.Name == "object-storage");
        var entitlement = checks.Single(check => check.Name == "platform-entitlement");

        var payload = new
        {
            status = healthy ? "Healthy" : "Unhealthy",
            service = "KingdomEngagements",
            module = "engagements",
            database = database.Healthy ? "ready" : "unavailable",
            redis = redis.Status,
            objectStorage = objectStorage.Status,
            platformEntitlement = entitlement.Healthy ? "enabled" : "unavailable",
            dependencies = checks.Select(check => new
            {
                name = check.Name,
                status = check.Status,
                durationMs = Math.Round(check.DurationMs, 1)
            })
        };

        return healthy
            ? Results.Ok(payload)
            : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}
