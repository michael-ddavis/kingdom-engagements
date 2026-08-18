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

    [Theory]
    [InlineData(null, "a1ab45e2-1746-4d91-9de0-9cf70ae75d3a")]
    [InlineData("ctg", "a1ab45e2-1746-4d91-9de0-9cf70ae75d3a")]
    [InlineData("divine-world-changers", "d1c00000-0000-4000-8000-000000000001")]
    [InlineData("heyy-king", "e1100000-0000-4000-8000-000000000001")]
    public void Development_principal_uses_the_selected_organization(
        string? organizationKey,
        string expectedTenantId)
    {
        var principal = KingdomIdentity.CreateDevelopmentPrincipal(organizationKey);

        Assert.Equal(expectedTenantId, principal.FindFirstValue(KingdomIdentity.TenantClaim));
        Assert.Equal(
            organizationKey ?? "ctg",
            principal.FindFirstValue(KingdomIdentity.DemoOrganizationClaim));
    }

    [Fact]
    public void Unknown_demo_organization_is_rejected()
    {
        Assert.False(KingdomIdentity.TryResolveDevelopmentOrganization(
            "not-an-organization",
            out _,
            out _));
        Assert.Throws<ArgumentException>(() =>
            KingdomIdentity.CreateDevelopmentPrincipal("not-an-organization"));
    }

    private static ClaimsPrincipal Principal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, KingdomIdentity.Scheme));
}
