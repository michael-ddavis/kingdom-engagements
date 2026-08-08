using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Tests;

public sealed class EngagementsMigrationConsistencyTests
{
    [Fact]
    public void RuntimeModelHasNoPendingMigrationChanges()
    {
        var options = new DbContextOptionsBuilder<EngagementsDbContext>()
            .ReplaceService<IModelCustomizer, EngagementsModelCustomizer>()
            .UseSqlServer("Server=localhost;Database=KingdomEngagementsModelCheck;User ID=sa;Password=LocalKingdom0S!;TrustServerCertificate=True")
            .Options;

        using var database = new EngagementsDbContext(options);

        Assert.False(
            database.Database.HasPendingModelChanges(),
            "The Engagements EF model changed without a matching migration/snapshot update. Add or update the migration before merging.");
    }
}
