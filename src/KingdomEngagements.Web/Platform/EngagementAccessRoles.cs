using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using KingdomEngagements.Web.Features;

namespace KingdomEngagements.Web.Platform;

public static class EngagementAccessRoles
{
    public const string Administrator = "administrator";
    public const string Coordinator = "coordinator";
    public const string Apostle = "apostle";
    public const string Minister = "minister";

    public static string CurrentRole(ClaimsPrincipal principal)
    {
        if (principal.HasClaim(KingdomIdentity.TenantRoleClaim, "owner") ||
            principal.HasClaim(KingdomIdentity.TenantRoleClaim, "administrator") ||
            principal.IsInRole("organization-owner") ||
            principal.IsInRole("organization-administrator"))
        {
            return Administrator;
        }

        var productRoles = principal.FindAll(KingdomIdentity.ProductRoleClaim)
            .Select(claim => claim.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (productRoles.Contains("engagements:administrator"))
            return Administrator;
        if (productRoles.Contains("engagements:director") ||
            productRoles.Contains("engagements:coordinator") ||
            productRoles.Contains("engagements:module-administrator"))
            return Coordinator;
        if (productRoles.Contains("engagements:executive") ||
            productRoles.Contains("engagements:viewer"))
            return Apostle;
        if (productRoles.Contains("engagements:minister") ||
            productRoles.Contains("engagements:module-member"))
            return Minister;

        return Minister;
    }

    public static bool IsMinister(ClaimsPrincipal principal) =>
        string.Equals(CurrentRole(principal), Minister, StringComparison.OrdinalIgnoreCase);

    public static bool IsApostle(ClaimsPrincipal principal) =>
        string.Equals(CurrentRole(principal), Apostle, StringComparison.OrdinalIgnoreCase);

    public static bool CanUseBookingDesk(ClaimsPrincipal principal)
    {
        var role = CurrentRole(principal);
        return role == Administrator || role == Coordinator;
    }

    public static bool CanViewAllEngagements(ClaimsPrincipal principal)
    {
        var role = CurrentRole(principal);
        return role == Administrator || role == Coordinator || role == Apostle;
    }

    public static bool CanViewFinancials(ClaimsPrincipal principal) =>
        KingdomIdentity.CanDirectEngagements(principal) ||
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:financial:read");

    public static bool CanViewInternalNotes(ClaimsPrincipal principal) =>
        KingdomIdentity.CanDirectEngagements(principal) ||
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:internal-notes:read");

    public static bool CanCompleteEngagements(ClaimsPrincipal principal) =>
        KingdomIdentity.CanDirectEngagements(principal) ||
        principal.HasClaim(KingdomIdentity.PermissionClaim, "engagements:closeout:complete");

}
