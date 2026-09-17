using KingdomEngagements.Web.Platform;
using Microsoft.Extensions.Configuration;

namespace KingdomEngagements.Tests;

public sealed class IntegrationServiceCredentialsTests
{
    [Fact]
    public void ConfiguredServiceKeyIsPreserved()
    {
        var credentials = IntegrationServiceCredentials.Load(
            Configuration("production-secret"),
            isDevelopment: false);

        Assert.Equal("production-secret", credentials.ServiceKey);
    }

    [Fact]
    public void DevelopmentKeepsTheExistingLocalServiceKey()
    {
        var credentials = IntegrationServiceCredentials.Load(
            Configuration(null),
            isDevelopment: true);

        Assert.Equal("local-kingdomos-integration", credentials.ServiceKey);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ProductionRequiresAConfiguredServiceKey(string? serviceKey)
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            IntegrationServiceCredentials.Load(
                Configuration(serviceKey),
                isDevelopment: false));

        Assert.Equal(
            "KingdomOS:Integration:ServiceKey is required outside Development.",
            error.Message);
    }

    private static IConfiguration Configuration(string? serviceKey) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:Integration:ServiceKey"] = serviceKey
            })
            .Build();
}
