using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KingdomEngagements.Web.Migrations;

public partial class TenantScopeIntegrationReceipts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropPrimaryKey(
            name: "PK_EngagementIntegrationReceipts",
            table: "EngagementIntegrationReceipts");

        migrationBuilder.AddColumn<Guid>(
            name: "TenantId",
            table: "EngagementIntegrationReceipts",
            type: "uniqueidentifier",
            nullable: false,
            defaultValue: Guid.Empty);

        migrationBuilder.AddPrimaryKey(
            name: "PK_EngagementIntegrationReceipts",
            table: "EngagementIntegrationReceipts",
            columns: new[] { "TenantId", "EventId" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
IF EXISTS (
    SELECT [EventId]
    FROM [dbo].[EngagementIntegrationReceipts]
    GROUP BY [EventId]
    HAVING COUNT(*) > 1
)
    THROW 51000, 'Cannot remove tenant scoping: duplicate integration EventId values exist across tenants.', 1;
""");

        migrationBuilder.DropPrimaryKey(
            name: "PK_EngagementIntegrationReceipts",
            table: "EngagementIntegrationReceipts");

        migrationBuilder.DropColumn(
            name: "TenantId",
            table: "EngagementIntegrationReceipts");

        migrationBuilder.AddPrimaryKey(
            name: "PK_EngagementIntegrationReceipts",
            table: "EngagementIntegrationReceipts",
            column: "EventId");
    }
}
