namespace KingdomEngagements.Web.Platform;

public static class IdentityKeyStorageConfiguration
{
    public static string? GetKeyPath(
        IConfiguration configuration,
        bool isDevelopment)
    {
        var keyPath = configuration["KingdomOS:Identity:KeyPath"];
        if (!string.IsNullOrWhiteSpace(keyPath))
            return keyPath;

        if (isDevelopment)
            return null;

        throw new InvalidOperationException(
            "KingdomOS:Identity:KeyPath is required outside Development so authentication keys remain durable.");
    }
}
