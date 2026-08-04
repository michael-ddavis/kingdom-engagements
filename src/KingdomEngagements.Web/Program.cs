using System.Security.Claims;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var provider = builder.Configuration["Database:Provider"] ?? "Sqlite";
var connectionString = builder.Configuration.GetConnectionString("EngagementsDatabase")
    ?? "Data Source=kingdom-engagements.db";
builder.Services.AddDbContext<EngagementsDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
    else
        options.UseSqlite(connectionString);
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
builder.Services.AddHttpClient<EngagementsEntitlementResolver>();
builder.Services.AddScoped<EngagementsInitializer>();
builder.Services.AddScoped<EngagementsService>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<EngagementsInitializer>().InitializeAsync();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (app.Environment.IsDevelopment() && context.User.Identity?.IsAuthenticated != true)
    {
        context.User = KingdomIdentity.CreateDevelopmentPrincipal();
    }
    await next();
});
app.UseMiddleware<EngagementsEntitlementMiddleware>();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "KingdomEngagements",
    module = "engagements"
}));
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
