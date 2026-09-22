using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Globalization;
using System.Text.Json;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace KingdomEngagements.Web.Platform;

public static class ApostolOSObservability
{
    public const string ServiceName = "apostolos-engagements";
    public const string ActivitySourceName = "ApostolOS.KingdomEngagements";
    public const string MeterName = "ApostolOS.KingdomEngagements";

    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);
    public static readonly Meter Meter = new(MeterName, "1.0.0");

    public static readonly Counter<long> RequestCount =
        Meter.CreateCounter<long>("apostolos.engagements.http.requests");

    public static readonly Counter<long> RequestFailureCount =
        Meter.CreateCounter<long>("apostolos.engagements.http.failures");

    public static readonly Histogram<double> RequestDurationMs =
        Meter.CreateHistogram<double>(
            "apostolos.engagements.http.duration",
            unit: "ms");

    public static readonly Counter<long> DependencyFailureCount =
        Meter.CreateCounter<long>("apostolos.engagements.dependency.failures");

    public static readonly Histogram<double> DependencyDurationMs =
        Meter.CreateHistogram<double>(
            "apostolos.engagements.dependency.duration",
            unit: "ms");

    public static void AddApostolOSObservability(this WebApplicationBuilder builder)
    {
        var configuration = builder.Configuration;
        var jsonConsole = configuration.GetValue(
            "KingdomOS:Observability:JsonConsole",
            builder.Environment.IsProduction());

        builder.Logging.Configure(options =>
        {
            options.ActivityTrackingOptions =
                ActivityTrackingOptions.TraceId |
                ActivityTrackingOptions.SpanId |
                ActivityTrackingOptions.ParentId |
                ActivityTrackingOptions.Tags;
        });

        if (jsonConsole)
        {
            builder.Logging.ClearProviders();
            builder.Logging.AddJsonConsole(options =>
            {
                options.IncludeScopes = true;
                options.TimestampFormat = "yyyy-MM-dd'T'HH:mm:ss.fffK";
                options.UseUtcTimestamp = true;
            });
        }

        var serviceName =
            configuration["KingdomOS:Observability:ServiceName"]
            ?? ServiceName;

        var serviceVersion =
            typeof(Program).Assembly.GetName().Version?.ToString()
            ?? "unknown";

        var otlpEndpointText =
            configuration["KingdomOS:Observability:OtlpEndpoint"]
            ?? configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];

        Uri? otlpEndpoint = null;
        if (!string.IsNullOrWhiteSpace(otlpEndpointText))
        {
            if (!Uri.TryCreate(otlpEndpointText, UriKind.Absolute, out otlpEndpoint))
                throw new InvalidOperationException("The configured OTLP endpoint is not a valid absolute URI.");
        }

        builder.Services
            .AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(
                serviceName: serviceName,
                serviceVersion: serviceVersion,
                serviceInstanceId: Environment.MachineName))
            .WithTracing(tracing =>
            {
                tracing
                    .AddSource(ActivitySourceName)
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.Filter = context =>
                            !context.Request.Path.StartsWithSegments("/health/live");
                    })
                    .AddHttpClientInstrumentation();

                if (otlpEndpoint is not null)
                {
                    tracing.AddOtlpExporter(options =>
                    {
                        options.Endpoint = otlpEndpoint;
                    });
                }
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddMeter(MeterName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();

                if (otlpEndpoint is not null)
                {
                    metrics.AddOtlpExporter(options =>
                    {
                        options.Endpoint = otlpEndpoint;
                    });
                }
            });
    }

    public static void RecordDependency(
        string dependency,
        bool healthy,
        TimeSpan duration)
    {
        var tags = new TagList
        {
            { "dependency", dependency },
            { "healthy", healthy }
        };

        DependencyDurationMs.Record(duration.TotalMilliseconds, tags);
        if (!healthy)
            DependencyFailureCount.Add(1, tags);
    }

    public static string RouteName(HttpContext context)
    {
        if (context.GetEndpoint() is RouteEndpoint routeEndpoint)
            return routeEndpoint.RoutePattern.RawText ?? "unknown";

        if (context.Request.Path.StartsWithSegments("/host/access"))
            return "/host/access/{redacted}";

        if (context.Request.Path.StartsWithSegments("/api/public/engagements/preparation"))
            return "/api/public/engagements/preparation/{redacted}";

        return "unmatched";
    }
}

public sealed class ApostolOSRequestObservabilityMiddleware(
    RequestDelegate next,
    ILogger<ApostolOSRequestObservabilityMiddleware> logger)
{
    public const string CorrelationHeader = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = ResolveCorrelationId(context.Request.Headers[CorrelationHeader].FirstOrDefault());
        context.Response.Headers[CorrelationHeader] = correlationId;

        var started = Stopwatch.GetTimestamp();
        var route = "unmatched";

        using var scope = logger.BeginScope(new Dictionary<string, object?>
        {
            ["CorrelationId"] = correlationId,
            ["RequestId"] = context.TraceIdentifier
        });

        Activity.Current?.SetTag("apostolos.correlation_id", correlationId);
        Activity.Current?.SetTag("apostolos.module", "engagements");

        try
        {
            await next(context);
            route = ApostolOSObservability.RouteName(context);
        }
        catch (Exception exception)
        {
            route = ApostolOSObservability.RouteName(context);
            ApostolOSObservability.RequestFailureCount.Add(
                1,
                new TagList
                {
                    { "method", context.Request.Method },
                    { "route", route },
                    { "status_code", 500 }
                });

            logger.LogError(
                exception,
                "Unhandled request failure for {Method} {Route}.",
                context.Request.Method,
                route);

            throw;
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(started);
            var statusCode = context.Response.StatusCode;

            var tags = new TagList
            {
                { "method", context.Request.Method },
                { "route", route },
                { "status_code", statusCode }
            };

            ApostolOSObservability.RequestCount.Add(1, tags);
            ApostolOSObservability.RequestDurationMs.Record(elapsed.TotalMilliseconds, tags);

            if (statusCode >= 500)
                ApostolOSObservability.RequestFailureCount.Add(1, tags);

            logger.LogInformation(
                "HTTP {Method} {Route} completed with {StatusCode} in {ElapsedMs} ms.",
                context.Request.Method,
                route,
                statusCode,
                elapsed.TotalMilliseconds.ToString("0.0", CultureInfo.InvariantCulture));
        }
    }

    internal static string ResolveCorrelationId(string? candidate)
    {
        if (!string.IsNullOrWhiteSpace(candidate) &&
            candidate.Length <= 128 &&
            candidate.All(IsSafeCorrelationCharacter))
        {
            return candidate;
        }

        return Activity.Current?.TraceId.ToString()
            ?? Guid.NewGuid().ToString("N");
    }

    private static bool IsSafeCorrelationCharacter(char value) =>
        char.IsLetterOrDigit(value) ||
        value is '-' or '_' or '.' or ':';
}
