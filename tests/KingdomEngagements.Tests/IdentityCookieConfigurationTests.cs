using KingdomEngagements.Web.Platform;
using Microsoft.Extensions.Configuration;

namespace KingdomEngagements.Tests;

public sealed class IdentityCookieConfigurationTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData(".example.test", ".example.test")]
    [InlineData("  .example.test  ", ".example.test")]
    public void SharedCookieDomainIsOptionalAndTrimmed(string? configured, string? expected)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["KingdomOS:Identity:CookieDomain"] = configured
            })
            .Build();

        Assert.Equal(expected, IdentityCookieConfiguration.SharedDomain(configuration));
    }
}
