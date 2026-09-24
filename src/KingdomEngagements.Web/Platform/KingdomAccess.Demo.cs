using System.Security.Claims;

namespace KingdomEngagements.Web.Platform;

public static partial class KingdomIdentity
{
    public const string DemoOrganizationHeader = "X-Kingdom-Demo-Organization";
    public const string DemoOrganizationCookie = "KingdomOS.DemoOrganization";
    public const string DemoOrganizationClaim = "kingdom:demo-organization";

    public static readonly Guid DemoTenantId =
        Guid.Parse("a1ab45e2-1746-4d91-9de0-9cf70ae75d3a");

    public static readonly Guid DivineWorldChangersTenantId =
        Guid.Parse("d1c00000-0000-4000-8000-000000000001");

    public static readonly Guid HeyyKingTenantId =
        Guid.Parse("e1100000-0000-4000-8000-000000000001");

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
            new(PermissionClaim, "engagements:responsibilities:manage"),
            new(ProductRoleClaim, "engagements:administrator"),
            new(ClaimTypes.Role, "Administrator"),
            new(ClaimTypes.Role, "Coordinator")
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
