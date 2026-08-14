using System.Security.Claims;
using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

public sealed class EngagementsAuthorizationTests
{
    [Theory]
    [InlineData(KingdomIdentity.PermissionClaim, "engagements:assignments:write")]
    [InlineData(KingdomIdentity.ProductRoleClaim, "engagements:administrator")]
    [InlineData(KingdomIdentity.ProductRoleClaim, "engagements:coordinator")]
    [InlineData(KingdomIdentity.TenantRoleClaim, "owner")]
    [InlineData(KingdomIdentity.TenantRoleClaim, "organization-administrator")]
    [InlineData(ClaimTypes.Role, "OrganizationAdministrator")]
    [InlineData(ClaimTypes.Role, "Coordinator")]
    public void Authorized_platform_and_product_roles_can_mutate_engagements(string claimType, string value)
    {
        var principal = Principal(new Claim(claimType, value));
        Assert.True(KingdomIdentity.CanWriteEngagements(principal));
    }

    [Theory]
    [InlineData(ClaimTypes.Role, "Student")]
    [InlineData(KingdomIdentity.TenantRoleClaim, "member")]
    [InlineData(KingdomIdentity.ProductRoleClaim, "engagements:viewer")]
    public void Read_only_roles_cannot_mutate_engagements(string claimType, string value)
    {
        var principal = Principal(new Claim(claimType, value));
        Assert.False(KingdomIdentity.CanWriteEngagements(principal));
    }

    private static ClaimsPrincipal Principal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, KingdomIdentity.Scheme));
}
