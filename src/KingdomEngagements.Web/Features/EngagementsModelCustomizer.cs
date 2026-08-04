using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementsModelCustomizer(
    ModelCustomizerDependencies dependencies) : ModelCustomizer(dependencies)
{
    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        base.Customize(modelBuilder, context);
        if (context is not EngagementsDbContext) return;

        modelBuilder.Entity<EngagementAssignment>()
            .Property(entity => entity.Id)
            .ValueGeneratedNever();
        modelBuilder.Entity<EngagementTask>()
            .Property(entity => entity.Id)
            .ValueGeneratedNever();
        modelBuilder.Entity<EngagementDocument>()
            .Property(entity => entity.Id)
            .ValueGeneratedNever();
        modelBuilder.Entity<EngagementIntegrationReceipt>()
            .Property(entity => entity.EventId)
            .ValueGeneratedNever();
    }
}
