using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

public sealed class EngagementsDemoRoleTests
{
    [Fact]
    public void Administrator_has_full_demo_engagement_control()
    {
        var principal = EngagementsDemoRoles.CreateDevelopmentPrincipal(
            "ctg",
            KingdomIdentity.DemoTenantId,
            EngagementsDemoRoles.Administrator);

        Assert.Equal(EngagementsDemoRoles.Administrator, EngagementsDemoRoles.CurrentRole(principal));
        Assert.True(KingdomIdentity.CanWriteEngagements(principal));
        Assert.True(EngagementsDemoRoles.CanUseBookingDesk(principal));
        Assert.True(EngagementsDemoRoles.CanViewAllEngagements(principal));
        Assert.True(EngagementsDemoRoles.CanViewFinancials(principal));
        Assert.True(EngagementsDemoRoles.CanViewInternalNotes(principal));
        Assert.True(EngagementsDemoRoles.CanCompleteEngagements(principal));
    }

    [Fact]
    public void Coordinator_can_manage_booking_and_assignments_but_cannot_complete_or_archive()
    {
        var principal = EngagementsDemoRoles.CreateDevelopmentPrincipal(
            "ctg",
            KingdomIdentity.DemoTenantId,
            EngagementsDemoRoles.Coordinator);

        Assert.Equal(EngagementsDemoRoles.Coordinator, EngagementsDemoRoles.CurrentRole(principal));
        Assert.True(KingdomIdentity.CanWriteEngagements(principal));
        Assert.True(EngagementsDemoRoles.CanUseBookingDesk(principal));
        Assert.True(EngagementsDemoRoles.CanViewAllEngagements(principal));
        Assert.True(EngagementsDemoRoles.CanViewFinancials(principal));
        Assert.True(EngagementsDemoRoles.CanViewInternalNotes(principal));
        Assert.False(EngagementsDemoRoles.CanCompleteEngagements(principal));
    }

    [Fact]
    public void Assigned_minister_is_read_only_and_has_no_booking_financial_or_internal_note_access()
    {
        var principal = EngagementsDemoRoles.CreateDevelopmentPrincipal(
            "ctg",
            KingdomIdentity.DemoTenantId,
            EngagementsDemoRoles.Minister);

        Assert.Equal(EngagementsDemoRoles.Minister, EngagementsDemoRoles.CurrentRole(principal));
        Assert.False(KingdomIdentity.CanWriteEngagements(principal));
        Assert.False(EngagementsDemoRoles.CanUseBookingDesk(principal));
        Assert.False(EngagementsDemoRoles.CanViewAllEngagements(principal));
        Assert.False(EngagementsDemoRoles.CanViewFinancials(principal));
        Assert.False(EngagementsDemoRoles.CanViewInternalNotes(principal));
        Assert.False(EngagementsDemoRoles.CanCompleteEngagements(principal));

        Assert.Equal(
            new[] { "assignment-demo-001", "assignment-demo-002", "assignment-demo-007" },
            EngagementsDemoRoles.AssignedEngagements(principal).OrderBy(value => value).ToArray());
    }

    [Fact]
    public void Assigned_minister_can_only_access_engagements_in_their_demo_assignment_scope()
    {
        var principal = EngagementsDemoRoles.CreateDevelopmentPrincipal(
            "ctg",
            KingdomIdentity.DemoTenantId,
            EngagementsDemoRoles.Minister);

        Assert.True(EngagementsDemoRoles.CanAccessAssignment(principal, Summary("assignment-demo-001")));
        Assert.True(EngagementsDemoRoles.CanAccessAssignment(principal, Summary("assignment-demo-007")));
        Assert.False(EngagementsDemoRoles.CanAccessAssignment(principal, Summary("assignment-unrelated-999")));
    }

    [Theory]
    [InlineData("administrator", "administrator")]
    [InlineData("coordinator", "coordinator")]
    [InlineData("minister", "minister")]
    [InlineData("MINISTER", "minister")]
    [InlineData("unknown-role", "administrator")]
    [InlineData(null, "administrator")]
    public void Demo_role_normalization_is_deterministic(string? supplied, string expected)
    {
        Assert.Equal(expected, EngagementsDemoRoles.Normalize(supplied));
    }

    private static EngagementSummary Summary(string externalId) => new(
        Guid.NewGuid(),
        externalId,
        "Demo Engagement",
        "Cynthia Thompson",
        "Demo Host",
        "Richmond, Virginia",
        DateTimeOffset.UtcNow.AddDays(7),
        "planning",
        50,
        1,
        "in-progress",
        "confirmed",
        "confirmed",
        "confirmed",
        "received",
        "not-started",
        DateTimeOffset.UtcNow);
}
