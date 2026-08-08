using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Platform;

public sealed class EngagementsStartupState
{
    private readonly object sync = new();
    private string phase = "starting";
    private string? problem;
    private DateTimeOffset updatedAtUtc = DateTimeOffset.UtcNow;

    public bool Ready { get; private set; }

    public (bool Ready, string Phase, string? Problem, DateTimeOffset UpdatedAtUtc) Snapshot()
    {
        lock (sync)
            return (Ready, phase, problem, updatedAtUtc);
    }

    public void MarkAttempt(string nextPhase)
    {
        lock (sync)
        {
            Ready = false;
            phase = nextPhase;
            problem = null;
            updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void MarkReady()
    {
        lock (sync)
        {
            Ready = true;
            phase = "ready";
            problem = null;
            updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void MarkFailure(Exception exception)
    {
        lock (sync)
        {
            Ready = false;
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
    public async Task InvokeAsync(HttpContext context, EngagementsStartupState startup)
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
            problem = snapshot.Problem,
            message = "Kingdom Engagements is still preparing its local database. It will retry automatically."
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

        endpoints.MapGet("/health", async (
            EngagementsStartupState startup,
            IServiceScopeFactory scopeFactory,
            CancellationToken cancellationToken) =>
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
                    problem = snapshot.Problem,
                    updatedAtUtc = snapshot.UpdatedAtUtc
                }, statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var database = scope.ServiceProvider.GetRequiredService<EngagementsDbContext>();
                if (database.Database.IsRelational() && !await database.Database.CanConnectAsync(cancellationToken))
                {
                    return Results.Json(new
                    {
                        status = "Unhealthy",
                        service = "KingdomEngagements",
                        module = "engagements",
                        dependency = "database",
                        problem = "KingdomEngagements cannot connect to its SQL database."
                    }, statusCode: StatusCodes.Status503ServiceUnavailable);
                }
            }
            catch (Exception exception)
            {
                return Results.Json(new
                {
                    status = "Unhealthy",
                    service = "KingdomEngagements",
                    module = "engagements",
                    dependency = "database",
                    problem = exception.GetBaseException().Message
                }, statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return Results.Ok(new
            {
                status = "Healthy",
                service = "KingdomEngagements",
                module = "engagements",
                database = "ready"
            });
        }).AllowAnonymous();

        return endpoints;
    }
}
