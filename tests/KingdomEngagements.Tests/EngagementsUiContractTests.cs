namespace KingdomEngagements.Tests;

public sealed class EngagementsUiContractTests
{
    [Fact]
    public void Destructive_actions_use_the_accessible_in_product_confirmation()
    {
        var wwwroot = FindWwwroot();
        var javascript = Directory
            .EnumerateFiles(wwwroot, "*.js", SearchOption.TopDirectoryOnly)
            .ToDictionary(Path.GetFileName, File.ReadAllText);

        Assert.All(javascript.Values, source =>
            Assert.DoesNotContain("window.confirm(", source, StringComparison.Ordinal));

        var product = javascript["legacy18-product.js"];
        Assert.Contains("window.kingdomConfirm = confirmAction", product, StringComparison.Ordinal);
        Assert.Contains("dialog.showModal()", product, StringComparison.Ordinal);
        Assert.Contains("autofocus", product, StringComparison.Ordinal);
    }

    [Fact]
    public void Invitation_queue_refreshes_when_staff_return_from_the_public_form()
    {
        var source = File.ReadAllText(Path.Combine(FindWwwroot(), "app.js"));

        Assert.Contains("window.addEventListener('focus', refreshRequestsAfterReturn)", source, StringComparison.Ordinal);
        Assert.Contains("document.addEventListener('visibilitychange', refreshRequestsAfterReturn)", source, StringComparison.Ordinal);
        Assert.Contains("link.getAttribute('href') === '#requests'", source, StringComparison.Ordinal);
    }

    [Fact]
    public void Focused_demo_data_is_source_clean_instead_of_client_hidden()
    {
        var seeder = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Features",
            "EngagementsDemoSeedWorker.cs"));
        Assert.Contains("assignment-demo-001", seeder, StringComparison.Ordinal);
        Assert.Contains("assignment-demo-002", seeder, StringComparison.Ordinal);
        Assert.Contains("assignment-demo-007", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Assignment(\"assignment-demo-003\"", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Assignment(\"assignment-demo-004\"", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Assignment(\"assignment-demo-005\"", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Assignment(\"assignment-demo-006\"", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Assignment(\"assignment-demo-008\"", seeder, StringComparison.Ordinal);
        Assert.Contains("\"CTG-DEMO-001\"", seeder, StringComparison.Ordinal);
        Assert.Contains("record.Status = seed.Status", seeder, StringComparison.Ordinal);
        Assert.Contains("record.AssignmentId = null", seeder, StringComparison.Ordinal);
        Assert.Contains("record.Communications.Clear()", seeder, StringComparison.Ordinal);
        Assert.DoesNotContain("Request(\"CTG-DEMO-002\"", seeder, StringComparison.Ordinal);
        Assert.Contains("RemoveRetiredSourceRowsAsync", seeder, StringComparison.Ordinal);

        var api = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "ClientApp",
            "src",
            "app",
            "core",
            "engagements-api.service.ts"));
        Assert.DoesNotContain("visibleDemoAssignments", api, StringComparison.Ordinal);
        Assert.DoesNotContain("visibleDemoRequests", api, StringComparison.Ordinal);
        Assert.DoesNotContain("shouldShowAssignment", api, StringComparison.Ordinal);
        Assert.DoesNotContain("shouldShowRequest", api, StringComparison.Ordinal);
    }

    [Fact]
    public void Connected_demo_story_uses_the_authoritative_assignment_deep_link()
    {
        var publisher = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Platform",
            "EngagementApprovalOperationsBridge.cs"));
        Assert.Contains("$\"{engagementsBrowserUrl}/assignments/{assignment.Id}\"", publisher, StringComparison.Ordinal);
        Assert.Contains("kind = \"checklist\"", publisher, StringComparison.Ordinal);
        Assert.Contains("$\"{assignment.Title} coordination checklist\"", publisher, StringComparison.Ordinal);
        Assert.Contains("Confirm host contact and event schedule", publisher, StringComparison.Ordinal);
        Assert.Contains("public Task PublishAsync(\n        EngagementAssignment assignment", publisher, StringComparison.Ordinal);

        var worker = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Features",
            "EngagementsDemoConnectedStoryWorker.cs"));
        Assert.Contains("await publisher.PublishAsync(assignment, stoppingToken)", worker, StringComparison.Ordinal);
        Assert.DoesNotContain("StoryReference", worker, StringComparison.Ordinal);
    }

    [Fact]
    public void Legacy_app_links_redirect_to_the_canonical_product_routes()
    {
        var program = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Program.cs"));

        Assert.Contains("Results.Redirect($\"/assignments{request.QueryString}\")", program, StringComparison.Ordinal);
        Assert.Contains("app.MapGet(\"/app/{*path}\"", program, StringComparison.Ordinal);
        Assert.Contains("$\"/{path.TrimStart('/')}\"", program, StringComparison.Ordinal);
        Assert.DoesNotContain("Path.Combine(environment.WebRootPath, \"app\", \"index.html\")", program, StringComparison.Ordinal);
    }

    [Fact]
    public void Connected_demo_assignment_always_seeds_named_care_handoffs()
    {
        var worker = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Features",
            "EngagementsDemoDepthWorker.cs"));

        Assert.Contains(
            "assignment.Status == \"complete\" || assignment.ExternalAssignmentId == \"assignment-demo-001\"",
            worker,
            StringComparison.Ordinal);
        Assert.Contains("Malik Robinson", worker, StringComparison.Ordinal);
        Assert.Contains("Renee Walker", worker, StringComparison.Ordinal);
        Assert.Contains("UpsertPersonResponseAsync", worker, StringComparison.Ordinal);
        Assert.Contains("response.AssignmentId = desired.AssignmentId", worker, StringComparison.Ordinal);
    }

    [Fact]
    public void Kingdom_care_is_a_first_class_assignment_tab_with_a_consent_gated_handoff()
    {
        var source = File.ReadAllText(Path.Combine(FindWwwroot(), "legacy18-product.js"));

        var contactsIndex = source.IndexOf("navButton('contacts'", StringComparison.Ordinal);
        var careIndex = source.IndexOf("navButton('care','Kingdom Care'", StringComparison.Ordinal);
        var documentsIndex = source.IndexOf("navButton('documents'", StringComparison.Ordinal);

        Assert.True(contactsIndex >= 0 && contactsIndex < careIndex);
        Assert.True(careIndex < documentsIndex);
        Assert.Contains(
            "state.product?.careEnabled ? navButton('care','Kingdom Care'",
            source,
            StringComparison.Ordinal);
        Assert.Contains("activePane === 'care'", source, StringComparison.Ordinal);
        Assert.DoesNotContain("data-legacy-pane=\"followup\"", source, StringComparison.Ordinal);
        Assert.Contains("Accountable follow-up", source, StringComparison.Ordinal);
        Assert.Contains("data-care-handoff-id", source, StringComparison.Ordinal);
        Assert.Contains("careConsent", source, StringComparison.Ordinal);
        Assert.Contains("consentConfirmed: true", source, StringComparison.Ordinal);
        Assert.Contains("Open Kingdom Care", source, StringComparison.Ordinal);
        Assert.Contains("rel=\"noopener\"", source, StringComparison.Ordinal);
    }

    [Fact]
    public void Assignment_documents_offer_explicit_preview_and_download_actions()
    {
        var wwwroot = FindWwwroot();
        foreach (var fileName in new[] { "preparation.js", "legacy18-product.js" })
        {
            var source = File.ReadAllText(Path.Combine(wwwroot, fileName));
            Assert.Contains("?download=false", source, StringComparison.Ordinal);
            Assert.Contains("?download=true", source, StringComparison.Ordinal);
            Assert.Contains("rel=\"noopener\"", source, StringComparison.Ordinal);
        }

        var feature = File.ReadAllText(FindRepositoryFile(
            "src",
            "KingdomEngagements.Web",
            "Features",
            "EngagementPreparation.cs"));
        Assert.Contains("bool? download", feature, StringComparison.Ordinal);
        Assert.Contains("download is true", feature, StringComparison.Ordinal);
        Assert.Contains("enableRangeProcessing: true", feature, StringComparison.Ordinal);
    }

    private static string FindWwwroot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(
                directory.FullName,
                "src",
                "KingdomEngagements.Web",
                "wwwroot");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate the Engagements wwwroot directory.");
    }

    private static string FindRepositoryFile(params string[] parts)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(new[] { directory.FullName }.Concat(parts).ToArray());
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not locate {Path.Combine(parts)}.");
    }
}
