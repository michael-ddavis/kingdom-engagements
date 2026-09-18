using KingdomEngagements.Web.Platform;
using Microsoft.Extensions.Configuration;

namespace KingdomEngagements.Tests;

public sealed class IdentityKeyStorageConfigurationTests
{
    [Fact]
    public void ConfiguredKeyPathIsPreserved()
    {
        var keyPath = IdentityKeyStorageConfiguration.GetKeyPath(
            Configuration("/var/apostolos/identity-keys"),
            isDevelopment: false);

        Assert.Equal("/var/apostolos/identity-keys", keyPath);
    }

    [Fact]
    public void DevelopmentCanUseFrameworkLocalKeys()
    {
        var keyPath = IdentityKeyStorageConfiguration.GetKeyPath(
            Configuration(null),
            isDevelopment: true);

        Assert.Null(keyPath);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ProductionRequiresDurableKeyStorage(string? keyPath)
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            IdentityKeyStorageConfiguration.GetKeyPath(
                Configuration(keyPath),
                isDevelopment: false));

        Assert.Equal(
            "KingdomOS:Identity:KeyPath is required outside Development so authentication keys remain durable.",
            error.Message);
    }

    private static IConfiguration Configuration(string? keyPath) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:Identity:KeyPath"] = keyPath
            })
            .Build();
}
