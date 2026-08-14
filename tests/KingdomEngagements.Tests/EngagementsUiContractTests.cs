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
    public void Assignment_documents_offer_explicit_preview_and_download_actions()
    {
        var wwwroot = FindWwwroot();
        foreach (var fileName in new[] { "preparation.js", "legacy18-product.js" })
        {
            var source = File.ReadAllText(Path.Combine(wwwroot, fileName));
            Assert.Contains("?download=false", source, StringComparison.Ordinal);
            Assert.Contains("?download=true", source, StringComparison.Ordinal);
            Assert.Contains("rel=\"noopener\", source, StringComparison.Ordinal);
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
