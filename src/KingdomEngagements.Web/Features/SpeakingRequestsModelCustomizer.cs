using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KingdomEngagements.Web.Features;

public sealed class SpeakingRequestsModelCustomizer(ModelCustomizerDependencies dependencies)
    : ModelCustomizer(dependencies)
{
    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        base.Customize(modelBuilder, context);
        modelBuilder.Entity<SpeakingRequestRecord>().Property(x => x.Id).ValueGeneratedNever();
        modelBuilder.Entity<SpeakingRequestCommunicationRecord>().Property(x => x.Id).ValueGeneratedNever();
    }
}
