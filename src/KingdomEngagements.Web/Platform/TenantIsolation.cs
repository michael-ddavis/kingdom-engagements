using System.Security.Claims;

namespace KingdomEngagements.Web.Platform;

public interface ICurrentTenant
{
    Guid? TenantId { get; }
    bool BypassActive { get; }
    IDisposable UseTenant(Guid tenantId);
    IDisposable BeginBypass(string reason);
}

public sealed class CurrentTenant(ILogger<CurrentTenant> logger) : ICurrentTenant
{
    private Guid? tenantId;
    private string? bypassReason;

    public Guid? TenantId => tenantId;
    public bool BypassActive => bypassReason is not null;

    public IDisposable UseTenant(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("A non-empty tenant id is required.", nameof(value));

        var previousTenant = tenantId;
        tenantId = value;
        return new Scope(() => tenantId = previousTenant);
    }

    public IDisposable BeginBypass(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Tenant isolation bypasses must include an auditable reason.", nameof(reason));

        var previousReason = bypassReason;
        bypassReason = reason.Trim();
        logger.LogWarning("Tenant isolation bypass activated: {Reason}", bypassReason);

        return new Scope(() =>
        {
            logger.LogInformation("Tenant isolation bypass ended: {Reason}", bypassReason);
            bypassReason = previousReason;
        });
    }

    private sealed class Scope(Action dispose) : IDisposable
    {
        private Action? disposeAction = dispose;

        public void Dispose() => Interlocked.Exchange(ref disposeAction, null)?.Invoke();
    }
}

public sealed class CurrentTenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ICurrentTenant currentTenant)
    {
        if (!KingdomIdentity.TryTenantId(context.User, out var tenantId))
        {
            await next(context);
            return;
        }

        using var scope = currentTenant.UseTenant(tenantId);
        await next(context);
    }
}

public static class TenantIsolation
{
    public static Guid RequireConfiguredTenant(
        IConfiguration configuration,
        string configurationKey)
    {
        var value = configuration[configurationKey];
        if (Guid.TryParse(value, out var tenantId) && tenantId != Guid.Empty)
            return tenantId;

        throw new InvalidOperationException(
            $"{configurationKey} must contain a valid non-empty tenant id.");
    }
}
