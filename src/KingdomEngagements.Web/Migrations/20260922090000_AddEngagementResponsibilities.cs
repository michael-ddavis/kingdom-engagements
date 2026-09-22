using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

[DbContext(typeof(EngagementsDbContext))]
[Migration("20260922090000_AddEngagementResponsibilities")]
public sealed class AddEngagementResponsibilities : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "OwnerSubject",
            table: "EngagementTasks",
            type: "nvarchar(180)",
            maxLength: 180,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "StandingResponsibilityAssignments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                LaneKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                UserSubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                DisplayName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                UpdatedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_StandingResponsibilityAssignments", x => x.Id));

        migrationBuilder.CreateTable(
            name: "EngagementResponsibilityOverrides",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                LaneKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                UserSubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                DisplayName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                UpdatedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EngagementResponsibilityOverrides", x => x.Id);
                table.ForeignKey(
                    name: "FK_EngagementResponsibilityOverrides_EngagementAssignments_AssignmentId",
                    column: x => x.AssignmentId,
                    principalTable: "EngagementAssignments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "EngagementLaneProgress",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                LaneKey = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                IsApplicable = table.Column<bool>(type: "bit", nullable: false),
                Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                Detail = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                DueAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                UpdatedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CompletedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                CompletedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EngagementLaneProgress", x => x.Id);
                table.ForeignKey(
                    name: "FK_EngagementLaneProgress_EngagementAssignments_AssignmentId",
                    column: x => x.AssignmentId,
                    principalTable: "EngagementAssignments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_StandingResponsibilityAssignments_TenantId_LaneKey",
            table: "StandingResponsibilityAssignments",
            columns: new[] { "TenantId", "LaneKey" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_EngagementResponsibilityOverrides_AssignmentId_LaneKey",
            table: "EngagementResponsibilityOverrides",
            columns: new[] { "AssignmentId", "LaneKey" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_EngagementLaneProgress_AssignmentId_LaneKey",
            table: "EngagementLaneProgress",
            columns: new[] { "AssignmentId", "LaneKey" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "EngagementLaneProgress");
        migrationBuilder.DropTable(name: "EngagementResponsibilityOverrides");
        migrationBuilder.DropTable(name: "StandingResponsibilityAssignments");

        migrationBuilder.DropColumn(
            name: "OwnerSubject",
            table: "EngagementTasks");
    }
}
