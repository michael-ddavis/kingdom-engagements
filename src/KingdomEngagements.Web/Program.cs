using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

var provider = builder.Configuration["Database:Provider"] ?? "InMemory";
var connectionString = builder.Configuration.GetConnectionString("EngagementsDatabase");
builder.Services.AddDbContext<EngagementsDbContext>(options =>
{
    options.ReplaceService<IModelCustomizer, EngagementsModelCustomizer>();
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagements");
});

var keyPath = builder.Configuration["KingdomOS:Identity:KeyPath"];
if (!string.IsNullOrWhiteSpace(keyPath))
{
    Directory.CreateDirectory(keyPath);
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keyPath))
        .SetApplicationName(KingdomIdentity.Scheme);
}

builder.Services.AddAuthentication(KingdomIdentity.Scheme)
    .AddCookie(KingdomIdentity.Scheme, options =>
    {
        options.Cookie.Name = ".KingdomOS.Identity";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient<EngagementsEntitlementResolver>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(3);
});
builder.Services.AddScoped<EngagementsInitializer>();
builder.Services.AddScoped<EngagementsService>();
builder.Services.AddSingleton<EngagementsStartupState>();
builder.Services.AddHostedService<EngagementsStartupWorker>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (app.Environment.IsDevelopment() && context.User.Identity?.IsAuthenticated != true)
        context.User = KingdomIdentity.CreateDevelopmentPrincipal();
    await next();
});
app.UseMiddleware<EngagementsReadinessMiddleware>();
app.UseMiddleware<EngagementsEntitlementMiddleware>();
app.UseAuthorization();

app.MapEngagementsHealth();
app.MapGet("/api/product", (IConfiguration configuration) => Results.Ok(new
{
    moduleKey = "engagements",
    shortName = "Engagements",
    name = "Kingdom Engagements",
    tenantName = configuration["KingdomOS:TenantName"] ?? "Cynthia Thompson Global",
    platformUrl = configuration["KingdomOS:PlatformBrowserUrl"] ?? "http://localhost:5100",
    boundary = "Assignment intake, host coordination, travel, lodging, transportation, documents, readiness, and closeout."
}));
app.MapGet("/api/capabilities", async (
    HttpContext context,
    EngagementsEntitlementResolver entitlements,
    CancellationToken cancellationToken) =>
{
    var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
    var state = await entitlements.GetStateAsync(tenantId, cancellationToken);
    return Results.Ok(new { engagementsEnabled = state == ModuleEntitlementState.Enabled, state = state.ToString() });
});

app.MapEngagementsEndpoints();
app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;
