using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

[DbContext(typeof(EngagementsDbContext))]
public sealed class EngagementsDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasAnnotation("ProductVersion", "10.0.10")
            .HasAnnotation("Relational:MaxIdentifierLength", 128);

        modelBuilder.Entity<EngagementAssignment>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.ExternalAssignmentId).HasMaxLength(160).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(220).IsRequired();
            entity.Property(x => x.SpeakerName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.HostOrganization).HasMaxLength(220).IsRequired();
            entity.Property(x => x.HostContactName).HasMaxLength(180);
            entity.Property(x => x.HostContactEmail).HasMaxLength(320);
            entity.Property(x => x.Location).HasMaxLength(300);
            entity.Property(x => x.StartsAtUtc);
            entity.Property(x => x.EndsAtUtc);
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.TravelStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.LodgingStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.TransportationStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.HostStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.DocumentsStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.CloseoutStatus).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(12000);
            entity.Property(x => x.CreatedAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TenantId, x.ExternalAssignmentId }).IsUnique();
            entity.ToTable("EngagementAssignments");
        });

        modelBuilder.Entity<EngagementDocument>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.Name).HasMaxLength(220).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(60).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.StorageReference).HasMaxLength(1000);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.AssignmentId);
            entity.ToTable("EngagementDocuments");
        });

        modelBuilder.Entity<EngagementIntegrationReceipt>(entity =>
        {
            entity.Property(x => x.EventId).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.EventName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.SourceModule).HasMaxLength(80).IsRequired();
            entity.Property(x => x.ReceivedAtUtc);
            entity.HasKey(x => x.EventId);
            entity.ToTable("EngagementIntegrationReceipts");
        });

        modelBuilder.Entity<EngagementTask>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.Category).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(240).IsRequired();
            entity.Property(x => x.Owner).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Detail).HasMaxLength(3000);
            entity.Property(x => x.DueAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.AssignmentId, x.Category, x.Title }).IsUnique();
            entity.ToTable("EngagementTasks");
        });

        modelBuilder.Entity<EngagementDocument>()
            .HasOne(x => x.Assignment)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<EngagementTask>()
            .HasOne(x => x.Assignment)
            .WithMany(x => x.Tasks)
            .HasForeignKey(x => x.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
    }
}
