using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

[DbContext(typeof(EngagementsDbContext))]
[Migration("20260922103000_AddEngagementMediaAssets")]
public sealed class AddEngagementMediaAssets : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "EngagementMediaAssets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                AssetType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                StorageReference = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                UpdatedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EngagementMediaAssets", x => x.Id);
                table.ForeignKey(
                    name: "FK_EngagementMediaAssets_EngagementAssignments_AssignmentId",
                    column: x => x.AssignmentId,
                    principalTable: "EngagementAssignments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_EngagementMediaAssets_AssignmentId_Name_AssetType",
            table: "EngagementMediaAssets",
            columns: new[] { "AssignmentId", "Name", "AssetType" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "EngagementMediaAssets");
    }
}
