using System.Security.Claims;
using System.Text.Json;

namespace KingdomEngagements.Web.Platform;

public static class KingdomIdentity
{
    public const string Scheme = "KingdomOS.Identity";
    public const string TenantClaim = "kingdom:tenant";
    public const string PermissionClaim = "kingdom:permission";
    public const string ProductRoleClaim = "kingdom:product-role";
    public static readonly Guid DemoTenantId = Guid.Parse("a1ab45e2-1746-4d91-9de0-9cf70ae75d3a");

    public static Guid TenantId(ClaimsPrincipal principal, HttpRequest request)
    {
        var value = principal.FindFirstValue(TenantClaim)
            ?? request.Headers["X-Kingdom-Tenant"].FirstOrDefault();
        return Guid.TryParse(value, out var tenantId) ? tenantId : DemoTenantId;
    }

    public static string Subject(ClaimsPrincipal principal, HttpRequest request) =>
        principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? request.Headers["X-Kingdom-Subject"].FirstOrDefault()
        ?? "unknown";

    public static ClaimsPrincipal CreateDevelopmentPrincipal()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "demo-engagements-admin"),
            new(ClaimTypes.Name, "Michael Davis"),
            new(ClaimTypes.Email, "michael@ctg.local"),
            new(TenantClaim, DemoTenantId.ToString()),
            new(PermissionClaim, "engagements:assignments:write"),
            new(ProductRoleClaim, "engagements:administrator"),
            new(ClaimTypes.Role, "Administrator"),
            new(ClaimTypes.Role, "Coordinator"),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme));
    }
}

public enum ModuleEntitlementState
{
    Enabled,
    Disabled,
    Unavailable
}

public sealed class EngagementsEntitlementResolver(
    HttpClient httpClient,
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    public async Task<ModuleEntitlementState> GetStateAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (environment.IsDevelopment() &&
            configuration.GetValue("KingdomOS:Entitlements:BypassInDevelopment", true))
            return ModuleEntitlementState.Enabled;

        var platformUrl = (configuration["KingdomOS:PlatformInternalUrl"]
            ?? configuration["KingdomOS:PlatformUrl"]
            ?? "http://platform:8080").TrimEnd('/');
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{platformUrl}/api/modules");
            request.Headers.TryAddWithoutValidation("X-Kingdom-Tenant", tenantId.ToString());
            request.Headers.TryAddWithoutValidation("X-Kingdom-Subject", "engagements-service");
            request.Headers.TryAddWithoutValidation("X-Kingdom-Role", "service");
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return ModuleEntitlementState.Unavailable;

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            return FindEngagements(document.RootElement, out var enabled)
                ? enabled ? ModuleEntitlementState.Enabled : ModuleEntitlementState.Disabled
                : ModuleEntitlementState.Disabled;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return ModuleEntitlementState.Unavailable;
        }
        catch (HttpRequestException)
        {
            return ModuleEntitlementState.Unavailable;
        }
        catch (JsonException)
        {
            return ModuleEntitlementState.Unavailable;
        }
    }

    private static bool FindEngagements(JsonElement element, out bool enabled)
    {
        enabled = false;
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
                if (FindEngagements(item, out enabled)) return true;
            return false;
        }

        if (element.ValueKind != JsonValueKind.Object) return false;
        var key = Property(element, "moduleKey") ?? Property(element, "key") ?? Property(element, "id");
        if (string.Equals(key, "engagements", StringComparison.OrdinalIgnoreCase))
        {
            if (element.TryGetProperty("enabled", out var enabledProperty) &&
                enabledProperty.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                enabled = enabledProperty.GetBoolean();
                return true;
            }
            var status = Property(element, "status") ?? Property(element, "state");
            enabled = string.Equals(status, "enabled", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "active", StringComparison.OrdinalIgnoreCase);
            return true;
        }

        foreach (var property in element.EnumerateObject())
            if (FindEngagements(property.Value, out enabled)) return true;
        return false;
    }

    private static string? Property(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}

public sealed class EngagementsEntitlementMiddleware(
    RequestDelegate next,
    IWebHostEnvironment environment,
    IConfiguration configuration)
{
    public async Task InvokeAsync(
        HttpContext context,
        EngagementsEntitlementResolver entitlements)
    {
        if (!RequiresEntitlement(context.Request.Path))
        {
            await next(context);
            return;
        }

        var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
        var state = await entitlements.GetStateAsync(tenantId, context.RequestAborted);
        if (state == ModuleEntitlementState.Enabled ||
            (state == ModuleEntitlementState.Unavailable && environment.IsDevelopment() &&
             configuration.GetValue("KingdomOS:Entitlements:FailOpenInDevelopment", true)))
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = state == ModuleEntitlementState.Disabled
            ? StatusCodes.Status403Forbidden
            : StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new
        {
            module = "engagements",
            state = state.ToString(),
            message = state == ModuleEntitlementState.Disabled
                ? "Kingdom Engagements is not enabled for this organization."
                : "Kingdom Platform could not verify the Engagements entitlement."
        });
    }

    private static bool RequiresEntitlement(PathString path) =>
        path.StartsWithSegments("/api/engagements") ||
        path.StartsWithSegments("/api/integration/events");
}
