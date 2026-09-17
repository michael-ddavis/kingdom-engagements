namespace KingdomEngagements.Web.Platform;

public sealed class IntegrationServiceCredentials
{
    private const string LocalDevelopmentServiceKey = "local-kingdomos-integration";

    private IntegrationServiceCredentials(string serviceKey)
    {
        ServiceKey = serviceKey;
    }

    public string ServiceKey { get; }

    public static IntegrationServiceCredentials Load(
        IConfiguration configuration,
        bool isDevelopment)
    {
        var configuredKey = configuration["KingdomOS:Integration:ServiceKey"];
        if (!string.IsNullOrWhiteSpace(configuredKey))
            return new IntegrationServiceCredentials(configuredKey);

        if (isDevelopment)
            return new IntegrationServiceCredentials(LocalDevelopmentServiceKey);

        throw new InvalidOperationException(
            "KingdomOS:Integration:ServiceKey is required outside Development.");
    }
}
