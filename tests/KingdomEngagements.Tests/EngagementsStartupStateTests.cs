using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

public sealed class EngagementsStartupStateTests
{
    [Fact]
    public void StartupStateReportsFailureAndCanRecover()
    {
        var state = new EngagementsStartupState();

        state.MarkAttempt("initializing");
        state.MarkFailure(new InvalidOperationException("database unavailable"));

        var failed = state.Snapshot();
        Assert.False(failed.Ready);
        Assert.Equal("initialization-failed", failed.Phase);
        Assert.Contains("database unavailable", failed.Problem);

        state.MarkAttempt("retrying-initialization");
        state.MarkReady();

        var ready = state.Snapshot();
        Assert.True(ready.Ready);
        Assert.Equal("ready", ready.Phase);
        Assert.Null(ready.Problem);
    }
}
