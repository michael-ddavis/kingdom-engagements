using System.Security.Claims;

namespace KingdomEngagements.Web.Platform;

public interface ICurrentTenantAccessor
{
    Guid? TenantId { get; }
    bool IsIsolationBypassed { get; }

    IDisposable BeginTenantScope(Guid tenantId, string reason);
}

public interface ITenantIsolationBypass
{
    IDisposable BeginBypass(string reason);
}

public sealed class CurrentTenantAccessor(
    IHttpContextAccessor httpContextAccessor,
    ILogger<CurrentTenantAccessor> logger)
    : ICurrentTenantAccessor, ITenantIsolationBypass
{
    private readonly AsyncLocal<TenantScopeState?> _scope = new();

    public Guid? TenantId =>
        _scope.Value?.TenantId
        ?? ResolveTenantId(httpContextAccessor.HttpContext?.User);

    public bool IsIsolationBypassed =>
        _scope.Value?.Bypass == true;

    public IDisposable BeginTenantScope(Guid tenantId, string reason)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant scope requires a non-empty tenant id.", nameof(tenantId));

        var previous = _scope.Value;
        _scope.Value = new TenantScopeState(tenantId, false, RequiredReason(reason));

        logger.LogDebug(
            "Tenant scope entered for tenant {TenantId}. Reason: {Reason}",
            tenantId,
            reason);

        return new ScopeLease(() => _scope.Value = previous);
    }

    public IDisposable BeginBypass(string reason)
    {
        var normalizedReason = RequiredReason(reason);
        var previous = _scope.Value;
        _scope.Value = new TenantScopeState(previous?.TenantId, true, normalizedReason);

        logger.LogWarning(
            "TENANT ISOLATION BYPASS entered. Tenant {TenantId}. Reason: {Reason}",
            previous?.TenantId,
            normalizedReason);

        return new ScopeLease(() =>
        {
            logger.LogWarning(
                "TENANT ISOLATION BYPASS exited. Reason: {Reason}",
                normalizedReason);
            _scope.Value = previous;
        });
    }

    public static Guid? ResolveTenantId(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
            return null;

        var internalTenant = ParseTenantClaim(
            principal.FindFirstValue(KingdomIdentity.TenantClaim));

        var hostTenant = ParseTenantClaim(
            principal.FindFirstValue(ApostolOSTenantClaims.HostTenantClaim));

        if (internalTenant is not null &&
            hostTenant is not null &&
            internalTenant != hostTenant)
        {
            return null;
        }

        return hostTenant ?? internalTenant;
    }

    private static Guid? ParseTenantClaim(string? value) =>
        Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty
            ? tenantId
            : null;

    private static string RequiredReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A tenant scope reason is required.", nameof(reason));

        return reason.Trim();
    }

    private sealed record TenantScopeState(
        Guid? TenantId,
        bool Bypass,
        string Reason);

    private sealed class ScopeLease(Action dispose) : IDisposable
    {
        private Action? _dispose = dispose;

        public void Dispose()
        {
            Interlocked.Exchange(ref _dispose, null)?.Invoke();
        }
    }
}

public static class ApostolOSTenantClaims
{
    public const string HostTenantClaim = "apostolos.tenant_id";
}

public abstract class TenantScopedDbContext(
    DbContextOptions options,
    ICurrentTenantAccessor currentTenant)
    : DbContext(options)
{
    protected Guid CurrentTenantId =>
        currentTenant.TenantId ?? Guid.Empty;

    protected bool TenantIsolationBypassed =>
        currentTenant.IsIsolationBypassed;
}
