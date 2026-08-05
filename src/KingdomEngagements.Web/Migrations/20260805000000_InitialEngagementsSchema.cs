using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

[DbContext(typeof(EngagementsDbContext))]
[Migration("20260805000000_InitialEngagementsSchema")]
public sealed class InitialEngagementsSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "EngagementAssignments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                ExternalAssignmentId = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                Title = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                SpeakerName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                HostOrganization = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                HostContactName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                HostContactEmail = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                Location = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                StartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                EndsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                TravelStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                LodgingStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                TransportationStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                HostStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                DocumentsStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                CloseoutStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                Notes = table.Column<string>(type: "nvarchar(max)", maxLength: 12000, nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_EngagementAssignments", x => x.Id));

        migrationBuilder.CreateTable(
            name: "EngagementIntegrationReceipts",
            columns: table => new
            {
                EventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                EventName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                SourceModule = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                ReceivedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_EngagementIntegrationReceipts", x => x.EventId));

        migrationBuilder.CreateTable(
            name: "EngagementDocuments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                Category = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                StorageReference = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EngagementDocuments", x => x.Id);
                table.ForeignKey(
                    name: "FK_EngagementDocuments_EngagementAssignments_AssignmentId",
                    column: x => x.AssignmentId,
                    principalTable: "EngagementAssignments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "EngagementTasks",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Category = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                Title = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                Owner = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                Detail = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                DueAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EngagementTasks", x => x.Id);
                table.ForeignKey(
                    name: "FK_EngagementTasks_EngagementAssignments_AssignmentId",
                    column: x => x.AssignmentId,
                    principalTable: "EngagementAssignments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_EngagementAssignments_TenantId_ExternalAssignmentId",
            table: "EngagementAssignments",
            columns: new[] { "TenantId", "ExternalAssignmentId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_EngagementDocuments_AssignmentId",
            table: "EngagementDocuments",
            column: "AssignmentId");

        migrationBuilder.CreateIndex(
            name: "IX_EngagementTasks_AssignmentId_Category_Title",
            table: "EngagementTasks",
            columns: new[] { "AssignmentId", "Category", "Title" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "EngagementDocuments");
        migrationBuilder.DropTable(name: "EngagementIntegrationReceipts");
        migrationBuilder.DropTable(name: "EngagementTasks");
        migrationBuilder.DropTable(name: "EngagementAssignments");
    }
}
