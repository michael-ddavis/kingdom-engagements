namespace KingdomEngagements.Web.Platform;

public sealed class PublicInvitationTenantResolver(IConfiguration configuration)
{
    public Guid PrimaryTenantId => RequiredTenantId(
        "KingdomOS:PublicInvitations:PrimaryTenantId");

    public Guid ItinerantTenantId => RequiredTenantId(
        "KingdomOS:PublicInvitations:ItinerantTenantId");

    private Guid RequiredTenantId(string key)
    {
        var value = configuration[key];
        return Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty
            ? tenantId
            : throw new InvalidOperationException(
                $"{key} must contain a non-empty tenant ID.");
    }
}
