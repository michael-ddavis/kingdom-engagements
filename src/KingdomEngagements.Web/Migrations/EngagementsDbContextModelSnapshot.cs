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

        modelBuilder.Entity<EngagementTeamMember>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.AccountId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.DisplayName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.IsActive);
            entity.Property(x => x.AddedBySubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.AddedByName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.AddedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TenantId, x.AccountId }).IsUnique();
            entity.ToTable("EngagementTeamMembers");
        });

        modelBuilder.Entity<EngagementIntegrationReceipt>(entity =>
        {
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.EventId).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.EventName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.SourceModule).HasMaxLength(80).IsRequired();
            entity.Property(x => x.ReceivedAtUtc);
            entity.HasKey(x => new { x.TenantId, x.EventId });
            entity.ToTable("EngagementIntegrationReceipts");
        });

        modelBuilder.Entity<EngagementMediaAsset>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.Name).HasMaxLength(260).IsRequired();
            entity.Property(x => x.AssetType).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Purpose).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Source).HasMaxLength(40).IsRequired();
            entity.Property(x => x.StorageReference).HasMaxLength(1000);
            entity.Property(x => x.ExternalUrl).HasMaxLength(2000);
            entity.Property(x => x.Notes).HasMaxLength(4000);
            entity.Property(x => x.UpdatedBySubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedByName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedAtUtc);
            entity.Property(x => x.CreatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.AssignmentId, x.Status });
            entity.ToTable("EngagementMediaAssets");
        });

        modelBuilder.Entity<EngagementTask>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.Category).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(240).IsRequired();
            entity.Property(x => x.Owner).HasMaxLength(180).IsRequired();
            entity.Property(x => x.OwnerSubject).HasMaxLength(180);
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Detail).HasMaxLength(3000);
            entity.Property(x => x.DueAtUtc);
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.AssignmentId, x.Category, x.Title }).IsUnique();
            entity.ToTable("EngagementTasks");
        });

        modelBuilder.Entity<StandingResponsibilityAssignment>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.LaneKey).HasMaxLength(80).IsRequired();
            entity.Property(x => x.UserSubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.IsActive);
            entity.Property(x => x.UpdatedBySubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedByName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.TenantId, x.LaneKey }).IsUnique();
            entity.ToTable("StandingResponsibilityAssignments");
        });

        modelBuilder.Entity<EngagementResponsibilityOverride>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.LaneKey).HasMaxLength(80).IsRequired();
            entity.Property(x => x.UserSubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.IsActive);
            entity.Property(x => x.UpdatedBySubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedByName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.AssignmentId, x.LaneKey }).IsUnique();
            entity.ToTable("EngagementResponsibilityOverrides");
        });

        modelBuilder.Entity<EngagementLaneProgress>(entity =>
        {
            entity.Property(x => x.Id).ValueGeneratedNever().HasColumnType("uniqueidentifier");
            entity.Property(x => x.TenantId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.AssignmentId).HasColumnType("uniqueidentifier");
            entity.Property(x => x.LaneKey).HasMaxLength(80).IsRequired();
            entity.Property(x => x.IsApplicable);
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Detail).HasMaxLength(3000);
            entity.Property(x => x.DueAtUtc);
            entity.Property(x => x.UpdatedBySubject).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedByName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.UpdatedAtUtc);
            entity.Property(x => x.CompletedBySubject).HasMaxLength(180);
            entity.Property(x => x.CompletedByName).HasMaxLength(180);
            entity.Property(x => x.CompletedAtUtc);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.AssignmentId, x.LaneKey }).IsUnique();
            entity.ToTable("EngagementLaneProgress");
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

        modelBuilder.Entity<EngagementMediaAsset>()
            .HasOne(x => x.Assignment)
            .WithMany()
            .HasForeignKey(x => x.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<EngagementResponsibilityOverride>()
            .HasOne(x => x.Assignment)
            .WithMany()
            .HasForeignKey(x => x.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<EngagementLaneProgress>()
            .HasOne(x => x.Assignment)
            .WithMany()
            .HasForeignKey(x => x.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
    }
}
