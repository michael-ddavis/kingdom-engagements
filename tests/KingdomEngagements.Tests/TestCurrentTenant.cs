using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

internal sealed class TestCurrentTenant(Guid? tenantId = null, bool bypass = false) : ICurrentTenant
{
    private Guid? currentTenantId = tenantId;
    private bool bypassActive = bypass;

    public Guid? TenantId => currentTenantId;
    public bool BypassActive => bypassActive;

    public IDisposable UseTenant(Guid tenantId)
    {
        var previous = currentTenantId;
        currentTenantId = tenantId;
        return new Scope(() => currentTenantId = previous);
    }

    public IDisposable BeginBypass(string reason)
    {
        _ = reason;
        var previous = bypassActive;
        bypassActive = true;
        return new Scope(() => bypassActive = previous);
    }

    private sealed class Scope(Action dispose) : IDisposable
    {
        private Action? disposeAction = dispose;
        public void Dispose() => Interlocked.Exchange(ref disposeAction, null)?.Invoke();
    }
}

internal static class TestTenants
{
    public static ICurrentTenant Bypass => new TestCurrentTenant(bypass: true);
    public static TestCurrentTenant For(Guid tenantId) => new(tenantId);
}
