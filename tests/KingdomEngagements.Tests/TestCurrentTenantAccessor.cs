using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

internal sealed class TestCurrentTenantAccessor : ICurrentTenantAccessor
{
    private Guid? _tenantId;
    private int _bypassDepth;

    public Guid? TenantId => _tenantId;
    public bool IsFilterBypassed => _bypassDepth > 0;

    public IDisposable BeginTenant(Guid tenantId, string reason)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant ID is required.", nameof(tenantId));

        var previous = _tenantId;
        if (previous is not null && previous != tenantId)
            throw new InvalidOperationException("A test tenant scope cannot switch tenants while active.");

        _tenantId = tenantId;
        return new Scope(() => _tenantId = previous);
    }

    public IDisposable BeginFilterBypass(string reason)
    {
        _bypassDepth++;
        return new Scope(() => _bypassDepth--);
    }

    private sealed class Scope(Action dispose) : IDisposable
    {
        private Action? _dispose = dispose;

        public void Dispose() => Interlocked.Exchange(ref _dispose, null)?.Invoke();
    }
}
