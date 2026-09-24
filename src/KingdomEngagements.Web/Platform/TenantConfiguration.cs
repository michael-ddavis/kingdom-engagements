namespace KingdomEngagements.Web.Platform;

public sealed class TenantConfiguration(IConfiguration configuration)
{
    public Guid DefaultPublicInvitationTenantId =>
        RequiredTenantId("KingdomOS:TenantRouting:DefaultPublicInvitationTenantId");

    public Guid HickmanPublicInvitationTenantId =>
        RequiredTenantId("KingdomOS:TenantRouting:HickmanPublicInvitationTenantId");

    public Guid ReadinessTenantId =>
        RequiredTenantId("KingdomOS:TenantRouting:ReadinessTenantId");

    private Guid RequiredTenantId(string key)
    {
        var value = configuration[key];
        if (!Guid.TryParse(value, out var tenantId) || tenantId == Guid.Empty)
            throw new InvalidOperationException($"{key} must contain a non-empty UUID.");

        return tenantId;
    }
}
