using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace KingdomEngagements.Tests;

public sealed class EngagementsDatabaseConfigurationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("InMemory")]
    public void DevelopmentUsesNamedInMemoryStorage(string? provider)
    {
        var options = new DbContextOptionsBuilder();

        EngagementsDatabaseConfiguration.Configure(
            options,
            Configuration(provider),
            new TestWebHostEnvironment("Development"),
            "engagements-test");

        Assert.Contains(
            options.Options.Extensions,
            extension => extension.GetType().Name.Contains("InMemory", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void NonDevelopmentEnvironmentRejectsEphemeralStorage(string environmentName)
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            EngagementsDatabaseConfiguration.Configure(
                new DbContextOptionsBuilder(),
                Configuration("InMemory"),
                new TestWebHostEnvironment(environmentName),
                "engagements-test"));

        Assert.Contains("will not start with ephemeral persistence", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void SqlServerUsesTheExistingEngagementsConnectionString()
    {
        var options = new DbContextOptionsBuilder();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "SqlServer",
                ["ConnectionStrings:EngagementsDatabase"] =
                    "Server=sql.example;Database=KingdomEngagements;User ID=engagements;Password=test;TrustServerCertificate=True"
            })
            .Build();

        EngagementsDatabaseConfiguration.Configure(
            options,
            configuration,
            new TestWebHostEnvironment("Production"),
            "engagements-test");

        Assert.Contains(
            options.Options.Extensions,
            extension => extension.GetType().Name.Contains("SqlServer", StringComparison.Ordinal));
    }

    [Fact]
    public void SqlServerRequiresItsConnectionString()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            EngagementsDatabaseConfiguration.Configure(
                new DbContextOptionsBuilder(),
                Configuration("SqlServer"),
                new TestWebHostEnvironment("Production"),
                "engagements-test"));

        Assert.Equal(
            "ConnectionStrings:EngagementsDatabase is required for SQL Server.",
            error.Message);
    }

    [Fact]
    public void UnknownProviderIsRejectedClearly()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            EngagementsDatabaseConfiguration.Configure(
                new DbContextOptionsBuilder(),
                Configuration("PostgreSql"),
                new TestWebHostEnvironment("Development"),
                "engagements-test"));

        Assert.Contains("is not supported", error.Message, StringComparison.Ordinal);
    }

    private static IConfiguration Configuration(string? provider) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = provider
            })
            .Build();

    private sealed class TestWebHostEnvironment(string environmentName) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "KingdomEngagements.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = environmentName;
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
