using System.Diagnostics;
using System.Security.Claims;

namespace KingdomEngagements.Web.Platform;

public interface ICurrentTenantAccessor
{
    Guid? TenantId { get; }
    bool IsFilterBypassed { get; }

    IDisposable BeginTenant(Guid tenantId, string reason);
    IDisposable BeginFilterBypass(string reason);
}

public sealed class CurrentTenantAccessor(
    IHttpContextAccessor httpContextAccessor,
    ILogger<CurrentTenantAccessor> logger) : ICurrentTenantAccessor
{
    private Guid? _scopedTenantId;
    private int _bypassDepth;

    public Guid? TenantId
    {
        get
        {
            if (_scopedTenantId is not null)
                return _scopedTenantId;

            var user = httpContextAccessor.HttpContext?.User;
            if (user is null)
                return null;

            var internalTenant = ParseClaim(user, KingdomIdentity.TenantClaim);
            var hostTenant = ParseClaim(user, "apostolos.tenant_id");

            if (internalTenant is not null &&
                hostTenant is not null &&
                internalTenant != hostTenant)
            {
                logger.LogError(
                    "Authenticated principal carried conflicting tenant claims. InternalTenant={InternalTenant} HostTenant={HostTenant}.",
                    internalTenant,
                    hostTenant);
                return null;
            }

            return internalTenant ?? hostTenant;
        }
    }

    public bool IsFilterBypassed => _bypassDepth > 0;

    public IDisposable BeginTenant(Guid tenantId, string reason)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant scope requires a non-empty tenant ID.", nameof(tenantId));
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Tenant scope reason is required.", nameof(reason));

        var previous = _scopedTenantId;
        _scopedTenantId = tenantId;

        using var activity = ApostolOSObservability.ActivitySource.StartActivity("tenant.scope");
        activity?.SetTag("apostolos.tenant_id", tenantId);
        activity?.SetTag("apostolos.tenant_scope_reason", reason);

        return new Scope(() => _scopedTenantId = previous);
    }

    public IDisposable BeginFilterBypass(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Tenant filter bypass reason is required.", nameof(reason));

        _bypassDepth++;

        logger.LogWarning(
            "Tenant query filter bypass entered. Reason={Reason} TraceId={TraceId}.",
            reason,
            Activity.Current?.TraceId.ToString() ?? "none");

        return new Scope(() =>
        {
            _bypassDepth--;
            logger.LogWarning(
                "Tenant query filter bypass exited. Reason={Reason} TraceId={TraceId}.",
                reason,
                Activity.Current?.TraceId.ToString() ?? "none");
        });
    }

    private static Guid? ParseClaim(ClaimsPrincipal principal, string claimType)
    {
        var value = principal.FindFirstValue(claimType);
        return Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty
            ? tenantId
            : null;
    }

    private sealed class Scope(Action dispose) : IDisposable
    {
        private Action? _dispose = dispose;

        public void Dispose() => Interlocked.Exchange(ref _dispose, null)?.Invoke();
    }
}

public sealed class NoCurrentTenantAccessor : ICurrentTenantAccessor
{
    public static NoCurrentTenantAccessor Instance { get; } = new();

    private NoCurrentTenantAccessor()
    {
    }

    public Guid? TenantId => null;
    public bool IsFilterBypassed => false;

    public IDisposable BeginTenant(Guid tenantId, string reason) =>
        throw new InvalidOperationException("A current tenant accessor was not provided to this DbContext.");

    public IDisposable BeginFilterBypass(string reason) =>
        throw new InvalidOperationException("A current tenant accessor was not provided to this DbContext.");
}

public abstract class TenantFilteredDbContext : Microsoft.EntityFrameworkCore.DbContext
{
    private readonly ICurrentTenantAccessor _tenantAccessor;

    protected TenantFilteredDbContext(
        Microsoft.EntityFrameworkCore.DbContextOptions options,
        ICurrentTenantAccessor? tenantAccessor)
        : base(options)
    {
        _tenantAccessor = tenantAccessor ?? NoCurrentTenantAccessor.Instance;
    }

    protected Guid CurrentTenantId => _tenantAccessor.TenantId ?? Guid.Empty;
    protected bool TenantFilterBypassed => _tenantAccessor.IsFilterBypassed;

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
        if (_tenantAccessor.IsFilterBypassed)
            throw new InvalidOperationException(
                "Tenant filter bypass scopes are query-only and cannot be used while saving changes.");

        var tenantId = _tenantAccessor.TenantId;

        foreach (var entry in ChangeTracker.Entries()
                     .Where(entry => entry.State is
                         Microsoft.EntityFrameworkCore.EntityState.Added or
                         Microsoft.EntityFrameworkCore.EntityState.Modified or
                         Microsoft.EntityFrameworkCore.EntityState.Deleted))
        {
            var tenantProperty = entry.Metadata.FindProperty("TenantId");
            if (tenantProperty is null || tenantProperty.ClrType != typeof(Guid))
                continue;

            if (tenantId is null)
            {
                throw new InvalidOperationException(
                    $"Tenant-scoped write to {entry.Metadata.ClrType.Name} was attempted without a current tenant.");
            }

            var value = (Guid?)entry.Property("TenantId").CurrentValue;
            if (value != tenantId)
            {
                throw new InvalidOperationException(
                    $"Tenant-scoped write to {entry.Metadata.ClrType.Name} targeted tenant {value} while the current tenant is {tenantId}.");
            }
        }
    }
}

public sealed class TenantContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        ICurrentTenantAccessor tenantAccessor)
    {
        var internalTenant = ClaimTenant(context.User, KingdomIdentity.TenantClaim);
        var hostTenant = ClaimTenant(context.User, "apostolos.tenant_id");

        if (internalTenant is not null &&
            hostTenant is not null &&
            internalTenant != hostTenant)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "The authenticated identity contains conflicting tenant scopes."
            });
            return;
        }

        var tenantId = internalTenant ?? hostTenant;
        var tenantHeader = context.Request.Headers["X-Kingdom-Tenant"].FirstOrDefault();

        if (tenantId is not null &&
            Guid.TryParse(tenantHeader, out var headerTenant) &&
            headerTenant != tenantId)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "The requested tenant does not match the authenticated tenant."
            });
            return;
        }

        if (tenantId is null)
        {
            await next(context);
            return;
        }

        using (tenantAccessor.BeginTenant(tenantId.Value, "authenticated HTTP request"))
        {
            await next(context);
        }
    }

    private static Guid? ClaimTenant(ClaimsPrincipal principal, string claimType)
    {
        var value = principal.FindFirstValue(claimType);
        return Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty
            ? tenantId
            : null;
    }
}
