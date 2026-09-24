using System.Security.Claims;
using KingdomEngagements.Web.Features;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Platform;

public interface ICurrentTenantAccessor
{
    Guid? TenantId { get; }
    bool IsBypassEnabled { get; }
    string? BypassReason { get; }

    IDisposable BeginTenantScope(Guid tenantId, string reason);
    IDisposable BeginCrossTenantBypass(string reason);
}

public sealed class CurrentTenantAccessor(
    IHttpContextAccessor httpContextAccessor,
    ILogger<CurrentTenantAccessor> logger) : ICurrentTenantAccessor
{
    private readonly AsyncLocal<TenantOverride?> _override = new();

    public Guid? TenantId =>
        _override.Value?.TenantId ?? ResolveRequestTenant();

    public bool IsBypassEnabled =>
        _override.Value?.Bypass == true;

    public string? BypassReason =>
        _override.Value?.Bypass == true ? _override.Value.Reason : null;

    public IDisposable BeginTenantScope(Guid tenantId, string reason)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("A non-empty tenant ID is required.", nameof(tenantId));

        var normalizedReason = RequiredReason(reason);
        var previous = _override.Value;
        _override.Value = new TenantOverride(tenantId, false, normalizedReason);

        return new RestoreScope(this, previous);
    }

    public IDisposable BeginCrossTenantBypass(string reason)
    {
        var normalizedReason = RequiredReason(reason);
        var previous = _override.Value;
        _override.Value = new TenantOverride(null, true, normalizedReason);

        logger.LogWarning(
            "TENANT ISOLATION BYPASS enabled. Reason: {Reason}. RequestPath: {RequestPath}. Subject: {Subject}.",
            normalizedReason,
            httpContextAccessor.HttpContext?.Request.Path.Value ?? "(background)",
            httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "(background)");

        return new RestoreScope(this, previous);
    }

    private Guid? ResolveRequestTenant()
    {
        var context = httpContextAccessor.HttpContext;
        if (context is null)
            return null;

        var primaryTenant = ParseClaim(
            context.User.FindFirstValue(KingdomIdentity.TenantClaim),
            KingdomIdentity.TenantClaim);

        var hostTenant = ParseClaim(
            context.User.FindFirstValue(HostAccessIdentity.TenantIdClaim),
            HostAccessIdentity.TenantIdClaim);

        if (primaryTenant.HasValue && hostTenant.HasValue && primaryTenant != hostTenant)
        {
            throw new UnauthorizedAccessException(
                "The authenticated identities contain conflicting tenant claims.");
        }

        if (primaryTenant.HasValue)
            return primaryTenant;

        if (hostTenant.HasValue)
            return hostTenant;

        var header = context.Request.Headers["X-Kingdom-Tenant"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header))
            return null;

        if (!Guid.TryParse(header, out var headerTenant) || headerTenant == Guid.Empty)
            throw new UnauthorizedAccessException("X-Kingdom-Tenant must contain a non-empty UUID.");

        return headerTenant;
    }

    private static Guid? ParseClaim(string? value, string claimType)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!Guid.TryParse(value, out var tenantId) || tenantId == Guid.Empty)
            throw new UnauthorizedAccessException($"The {claimType} claim is invalid.");

        return tenantId;
    }

    private static string RequiredReason(string reason) =>
        string.IsNullOrWhiteSpace(reason)
            ? throw new ArgumentException("Tenant scope changes require an auditable reason.", nameof(reason))
            : reason.Trim();

    private sealed record TenantOverride(Guid? TenantId, bool Bypass, string Reason);

    private sealed class RestoreScope(
        CurrentTenantAccessor owner,
        TenantOverride? previous) : IDisposable
    {
        private bool _disposed;

        public void Dispose()
        {
            if (_disposed)
                return;

            owner._override.Value = previous;
            _disposed = true;
        }
    }
}

public abstract class TenantScopedDbContext(
    DbContextOptions options,
    ICurrentTenantAccessor? tenantAccessor) : DbContext(options)
{
    private readonly ICurrentTenantAccessor _tenantAccessor =
        tenantAccessor ?? DenyAllTenantAccessor.Instance;

    protected bool TenantFilterBypassed => _tenantAccessor.IsBypassEnabled;
    protected bool TenantFilterHasTenant => _tenantAccessor.TenantId.HasValue;
    protected Guid TenantFilterTenantId => _tenantAccessor.TenantId ?? Guid.Empty;

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidateTenantWrites();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ValidateTenantWrites();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ValidateTenantWrites()
    {
        if (_tenantAccessor.IsBypassEnabled)
            return;

        var tenantId = _tenantAccessor.TenantId;
        var tenantEntries = ChangeTracker.Entries()
            .Where(entry =>
                entry.State is EntityState.Added or EntityState.Modified &&
                entry.Metadata.FindProperty("TenantId") is not null)
            .ToArray();

        if (tenantEntries.Length == 0)
            return;

        if (tenantId is null)
        {
            throw new UnauthorizedAccessException(
                "Tenant-scoped data cannot be written without an active tenant context.");
        }

        foreach (var entry in tenantEntries)
        {
            var value = entry.Property("TenantId").CurrentValue;
            if (value is not Guid entityTenantId || entityTenantId != tenantId.Value)
            {
                throw new UnauthorizedAccessException(
                    $"Tenant-scoped write rejected for {entry.Metadata.ClrType.Name}.");
            }
        }
    }

    private sealed class DenyAllTenantAccessor : ICurrentTenantAccessor
    {
        public static DenyAllTenantAccessor Instance { get; } = new();

        public Guid? TenantId => null;
        public bool IsBypassEnabled => false;
        public string? BypassReason => null;

        public IDisposable BeginTenantScope(Guid tenantId, string reason) =>
            throw new InvalidOperationException("No tenant accessor was supplied to this DbContext.");

        public IDisposable BeginCrossTenantBypass(string reason) =>
            throw new InvalidOperationException("No tenant accessor was supplied to this DbContext.");
    }
}
