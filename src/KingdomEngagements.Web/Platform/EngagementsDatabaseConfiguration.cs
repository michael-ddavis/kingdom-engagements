using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Platform;

public static class EngagementsDatabaseConfiguration
{
    public static void Configure(
        DbContextOptionsBuilder options,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        string inMemoryDatabaseName)
    {
        var provider = configuration["Database:Provider"];
        if (string.Equals(provider, "SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            var connectionString = configuration.GetConnectionString("EngagementsDatabase");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "ConnectionStrings:EngagementsDatabase is required for SQL Server.");
            }

            options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
            return;
        }

        var useInMemory = string.IsNullOrWhiteSpace(provider) ||
            string.Equals(provider, "InMemory", StringComparison.OrdinalIgnoreCase);
        if (useInMemory && environment.IsDevelopment())
        {
            options.UseInMemoryDatabase(inMemoryDatabaseName);
            return;
        }

        if (useInMemory)
        {
            throw new InvalidOperationException(
                "Database:Provider must be SqlServer outside Development. " +
                "Kingdom Engagements will not start with ephemeral persistence in this environment.");
        }

        throw new InvalidOperationException(
            $"Database:Provider '{provider}' is not supported. Use InMemory for local Development or SqlServer.");
    }
}
