namespace KingdomEngagements.Web.Platform;

public static class IdentityCookieConfiguration
{
    public static string? SharedDomain(IConfiguration configuration)
    {
        var domain = configuration["KingdomOS:Identity:CookieDomain"];
        return string.IsNullOrWhiteSpace(domain) ? null : domain.Trim();
    }
}
