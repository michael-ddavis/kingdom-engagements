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
}
