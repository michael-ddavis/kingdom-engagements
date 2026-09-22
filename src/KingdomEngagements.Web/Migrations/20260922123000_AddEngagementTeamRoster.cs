using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

[DbContext(typeof(EngagementsDbContext))]
[Migration("20260922123000_AddEngagementTeamRoster")]
public sealed class AddEngagementTeamRoster : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "EngagementTeamMembers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                DisplayName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                AddedBySubject = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                AddedByName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                AddedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_EngagementTeamMembers", x => x.Id));

        migrationBuilder.CreateIndex(
            name: "IX_EngagementTeamMembers_TenantId_AccountId",
            table: "EngagementTeamMembers",
            columns: new[] { "TenantId", "AccountId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "EngagementTeamMembers");
    }
}
