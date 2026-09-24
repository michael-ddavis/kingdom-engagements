namespace KingdomEngagements.Web.Platform;

public static class ApostolOSProductionConfiguration
{
    private const string DefaultSecretsDirectory = "/run/secrets";

    public static void AddApostolOSSecretSources(this WebApplicationBuilder builder)
    {
        var directory =
            builder.Configuration["KingdomOS:Secrets:Directory"]
            ?? DefaultSecretsDirectory;

        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory))
            return;

        var secrets = LoadMountedSecrets(directory);
        if (secrets.Count > 0)
            builder.Configuration.AddInMemoryCollection(secrets);
    }

    public static void ValidateApostolOSProductionConfiguration(this WebApplicationBuilder builder)
    {
        if (!builder.Environment.IsProduction())
            return;

        var configuration = builder.Configuration;
        var problems = new List<string>();

        Require(
            configuration["Database:Provider"]?.Equals("SqlServer", StringComparison.OrdinalIgnoreCase) == true,
            "Database:Provider must be SqlServer in Production.",
            problems);

        Require(
            configuration.GetValue("Database:RequireRelational", false),
            "Database:RequireRelational must be true in Production.",
            problems);

        RequireValue(
            configuration.GetConnectionString("EngagementsDatabase"),
            "ConnectionStrings:EngagementsDatabase",
            problems);

        Require(
            configuration.GetValue("KingdomOS:DistributedRuntime:RequireRedis", false),
            "KingdomOS:DistributedRuntime:RequireRedis must be true in Production.",
            problems);

        RequireValue(
            configuration.GetConnectionString("Redis"),
            "ConnectionStrings:Redis",
            problems);

        Require(
            configuration["KingdomOS:DocumentStorage:Provider"]?.Equals("S3", StringComparison.OrdinalIgnoreCase) == true,
            "KingdomOS:DocumentStorage:Provider must be S3 in Production.",
            problems);

        RequireValue(
            configuration["KingdomOS:DocumentStorage:S3:BucketName"],
            "KingdomOS:DocumentStorage:S3:BucketName",
            problems);

        RequireValue(
            configuration["KingdomOS:DocumentStorage:S3:Region"] ?? configuration["AWS:Region"],
            "KingdomOS:DocumentStorage:S3:Region or AWS:Region",
            problems);

        var objectStorageServiceUrl =
            configuration["KingdomOS:DocumentStorage:S3:ServiceUrl"];
        var allowInsecureObjectStorageEndpoint =
            configuration.GetValue(
                "KingdomOS:DocumentStorage:S3:AllowInsecureEndpoint",
                false);

        if (!string.IsNullOrWhiteSpace(objectStorageServiceUrl) &&
            Uri.TryCreate(objectStorageServiceUrl, UriKind.Absolute, out var objectStorageUri))
        {
            Require(
                objectStorageUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
                allowInsecureObjectStorageEndpoint,
                "KingdomOS:DocumentStorage:S3:ServiceUrl must use HTTPS in Production unless AllowInsecureEndpoint is explicitly enabled.",
                problems);
        }

        var publicBaseUrl = configuration["KingdomOS:HostAccess:PublicBaseUrl"];
        Require(
            Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var publicUri) &&
            publicUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase),
            "KingdomOS:HostAccess:PublicBaseUrl must be an absolute HTTPS URL in Production.",
            problems);

        Require(
            !configuration.GetValue("KingdomOS:HostAccess:LegacyTokenRoutesEnabled", true),
            "KingdomOS:HostAccess:LegacyTokenRoutesEnabled must be false in Production.",
            problems);

        Require(
            !configuration.GetValue("KingdomOS:Identity:DemoProfilesEnabled", false),
            "KingdomOS:Identity:DemoProfilesEnabled must be false in Production.",
            problems);

        Require(
            !configuration.GetValue("KingdomOS:Entitlements:BypassInDevelopment", false),
            "KingdomOS:Entitlements:BypassInDevelopment must be false in Production.",
            problems);

        Require(
            !configuration.GetValue("KingdomOS:Entitlements:FailOpenInDevelopment", false),
            "KingdomOS:Entitlements:FailOpenInDevelopment must be false in Production.",
            problems);

        RequireTenantId(
            configuration["KingdomOS:PublicInvitations:PrimaryTenantId"],
            "KingdomOS:PublicInvitations:PrimaryTenantId",
            problems);
        RequireTenantId(
            configuration["KingdomOS:PublicInvitations:ItinerantTenantId"],
            "KingdomOS:PublicInvitations:ItinerantTenantId",
            problems);
        RequireTenantId(
            configuration["KingdomOS:Health:TenantId"],
            "KingdomOS:Health:TenantId",
            problems);

        var allowedHosts = configuration["AllowedHosts"];
        Require(
            !string.IsNullOrWhiteSpace(allowedHosts) && allowedHosts.Trim() != "*",
            "AllowedHosts must name the production host(s); wildcard '*' is not allowed in Production.",
            problems);

        var requireTelemetryExporter =
            configuration.GetValue("KingdomOS:Observability:RequireExporter", true);
        var otlpEndpoint =
            configuration["KingdomOS:Observability:OtlpEndpoint"]
            ?? configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];

        if (requireTelemetryExporter)
        {
            Require(
                Uri.TryCreate(otlpEndpoint, UriKind.Absolute, out _),
                "An OTLP endpoint is required in Production. Set KingdomOS:Observability:OtlpEndpoint or OTEL_EXPORTER_OTLP_ENDPOINT.",
                problems);
        }

        if (problems.Count == 0)
            return;

        throw new InvalidOperationException(
            "ApostolOS production configuration is incomplete or unsafe:" +
            Environment.NewLine +
            string.Join(Environment.NewLine, problems.Select(problem => $" - {problem}")));
    }

    internal static Dictionary<string, string?> LoadMountedSecrets(string directory)
    {
        var secrets = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var path in Directory.EnumerateFiles(directory))
        {
            var fileName = Path.GetFileName(path);
            if (string.IsNullOrWhiteSpace(fileName))
                continue;

            var configurationKey = fileName.Replace("__", ":", StringComparison.Ordinal);
            var value = File.ReadAllText(path).TrimEnd('\r', '\n');

            if (string.IsNullOrEmpty(value))
                continue;

            secrets[configurationKey] = value;
        }

        return secrets;
    }

    private static void Require(bool condition, string message, ICollection<string> problems)
    {
        if (!condition)
            problems.Add(message);
    }

    private static void RequireValue(string? value, string name, ICollection<string> problems)
    {
        if (string.IsNullOrWhiteSpace(value))
            problems.Add($"{name} is required in Production.");
    }

    private static void RequireTenantId(
        string? value,
        string name,
        ICollection<string> problems)
    {
        if (!Guid.TryParse(value, out var tenantId) || tenantId == Guid.Empty)
            problems.Add($"{name} must contain a non-empty tenant ID in Production.");
    }
}
