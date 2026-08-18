using System.Security.Claims;
using System.Text.Json;

namespace KingdomEngagements.Web.Platform;

public static class KingdomIdentity
{
    public const string Scheme = "KingdomOS.Identity";
    public const string TenantClaim = "kingdom:tenant";
    public const string TenantRoleClaim = "kingdom:tenant-role";
    public const string PermissionClaim = "kingdom:permission";
    public const string ProductRoleClaim = "kingdom:product-role";
    public const string DemoOrganizationHeader = "X-Kingdom-Demo-Organization";
    public const string DemoOrganizationCookie = "KingdomOS.DemoOrganization";
    public const string DemoOrganizationClaim = "kingdom:demo-organization";
    public static readonly Guid DemoTenantId = Guid.Parse("a1ab45e2-1746-4d91-9de0-9cf70ae75d3a");
    public static readonly Guid DivineWorldChangersTenantId = Guid.Parse("d1c00000-0000-4000-8000-000000000001");
    public static readonly Guid HeyyKingTenantId = Guid.Parse("e1100000-0000-4000-8000-000000000001");

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

    public static bool CanWriteEngagements(ClaimsPrincipal principal)
    {
        static bool Matches(string value, params string[] accepted) =>
            accepted.Contains(value, StringComparer.OrdinalIgnoreCase);

        return principal.Claims.Any(claim =>
            claim.Type == PermissionClaim && Matches(claim.Value, "engagements:assignments:write") ||
            claim.Type == ProductRoleClaim && Matches(claim.Value, "engagements:administrator", "engagements:coordinator") ||
            claim.Type == TenantRoleClaim && Matches(claim.Value, "owner", "administrator", "organization-administrator", "super-admin") ||
            claim.Type == ClaimTypes.Role && Matches(claim.Value, "Administrator", "Coordinator", "OrganizationAdministrator", "Organization Administrator", "SuperAdmin", "Super Administrator"));
    }

    public static ClaimsPrincipal CreateDevelopmentPrincipal(string? organizationKey = null)
    {
        if (!TryResolveDevelopmentOrganization(organizationKey, out var key, out var tenantId))
            throw new ArgumentException("The selected demo organization is not available.", nameof(organizationKey));

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "demo-engagements-admin"),
            new(ClaimTypes.Name, "Michael Davis"),
            new(ClaimTypes.Email, "michael@kingdomos.local"),
            new(TenantClaim, tenantId.ToString("D")),
            new(TenantRoleClaim, "owner"),
            new(DemoOrganizationClaim, key),
            new(PermissionClaim, "engagements:assignments:write"),
            new(ProductRoleClaim, "engagements:administrator"),
            new(ClaimTypes.Role, "Administrator"),
            new(ClaimTypes.Role, "Coordinator"),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme));
    }

    public static bool TryResolveDevelopmentOrganization(
        string? organizationKey,
        out string key,
        out Guid tenantId)
    {
        key = string.IsNullOrWhiteSpace(organizationKey)
            ? "ctg"
            : organizationKey.Trim().ToLowerInvariant();
        tenantId = key switch
        {
            "ctg" => DemoTenantId,
            "divine-world-changers" => DivineWorldChangersTenantId,
            "heyy-king" => HeyyKingTenantId,
            _ => Guid.Empty
        };
        return tenantId != Guid.Empty;
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
    public Task<ModuleEntitlementState> GetStateAsync(
        Guid tenantId,
        CancellationToken cancellationToken) =>
        GetModuleStateAsync(
            "engagements",
            tenantId,
            allowDevelopmentBypass: true,
            cancellationToken);

    public async Task<ModuleEntitlementState> GetModuleStateAsync(
        string moduleKey,
        Guid tenantId,
        bool allowDevelopmentBypass,
        CancellationToken cancellationToken)
    {
        if (allowDevelopmentBypass &&
            environment.IsDevelopment() &&
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
            return FindModule(document.RootElement, moduleKey, out var enabled)
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

    private static bool FindModule(
        JsonElement element,
        string moduleKey,
        out bool enabled)
    {
        enabled = false;
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
                if (FindModule(item, moduleKey, out enabled)) return true;
            return false;
        }

        if (element.ValueKind != JsonValueKind.Object) return false;
        var key = Property(element, "moduleKey") ?? Property(element, "key") ?? Property(element, "id");
        if (string.Equals(key, moduleKey, StringComparison.OrdinalIgnoreCase))
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
            if (FindModule(property.Value, moduleKey, out enabled)) return true;
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
