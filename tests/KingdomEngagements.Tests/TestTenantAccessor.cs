using KingdomEngagements.Web.Platform;

namespace KingdomEngagements.Tests;

internal sealed class TestTenantAccessor : ICurrentTenantAccessor
{
    private Guid? _tenantId;
    private bool _bypass;
    private string? _reason;

    public TestTenantAccessor(Guid? tenantId = null, bool bypass = false)
    {
        _tenantId = tenantId;
        _bypass = bypass;
        _reason = bypass ? "Test fixture cross-tenant setup." : null;
    }

    public Guid? TenantId => _tenantId;
    public bool IsBypassEnabled => _bypass;
    public string? BypassReason => _reason;

    public IDisposable BeginTenantScope(Guid tenantId, string reason)
    {
        var previous = Snapshot();
        _tenantId = tenantId;
        _bypass = false;
        _reason = reason;
        return new RestoreScope(this, previous);
    }

    public IDisposable BeginCrossTenantBypass(string reason)
    {
        var previous = Snapshot();
        _tenantId = null;
        _bypass = true;
        _reason = reason;
        return new RestoreScope(this, previous);
    }

    private State Snapshot() => new(_tenantId, _bypass, _reason);

    private sealed record State(Guid? TenantId, bool Bypass, string? Reason);

    private sealed class RestoreScope(TestTenantAccessor owner, State previous) : IDisposable
    {
        private bool _disposed;

        public void Dispose()
        {
            if (_disposed) return;
            owner._tenantId = previous.TenantId;
            owner._bypass = previous.Bypass;
            owner._reason = previous.Reason;
            _disposed = true;
        }
    }
}
