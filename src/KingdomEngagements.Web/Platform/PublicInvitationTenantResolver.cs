namespace KingdomEngagements.Web.Platform;

public sealed class PublicInvitationTenantResolver(IConfiguration configuration)
{
    public Guid CynthiaTenantId =>
        RequiredTenantId("KingdomOS:PublicInvitations:CynthiaTenantId");

    public Guid HickmanTenantId =>
        RequiredTenantId("KingdomOS:PublicInvitations:HickmanTenantId");

    private Guid RequiredTenantId(string key)
    {
        var value = configuration[key];

        return Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty
            ? tenantId
            : throw new InvalidOperationException($"{key} must contain a non-empty tenant UUID.");
    }
}
