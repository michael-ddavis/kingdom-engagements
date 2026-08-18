using System.Text.Json.Serialization;
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

builder.Services.AddDbContext<SpeakingRequestsDbContext>(options =>
{
    options.ReplaceService<IModelCustomizer, SpeakingRequestsModelCustomizer>();
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsSpeakingRequests");
});

builder.Services.AddDbContext<EngagementPreparationDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsPreparation");
});

builder.Services.AddDbContext<AssignmentWorkspaceDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsAssignmentWorkspace");
});

builder.Services.AddDbContext<EngagementCompletionDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsCompletion");
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
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
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("EngagementsWrite", policy => policy.RequireAssertion(context =>
        KingdomIdentity.CanWriteEngagements(context.User)));
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient<EngagementsEntitlementResolver>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(3);
});
builder.Services.AddScoped<EngagementsInitializer>();
builder.Services.AddScoped<EngagementsService>();
builder.Services.AddScoped<SpeakingRequestsService>();
builder.Services.AddScoped<EngagementPreparationService>();
builder.Services.AddScoped<AssignmentWorkspaceService>();
builder.Services.AddScoped<EngagementCompletionService>();
builder.Services.AddScoped<EngagementOperationsCoordinationPublisher>();
builder.Services.AddScoped<EngagementCareHandoffPublisher>();
builder.Services.AddSingleton<EngagementsStartupState>();
builder.Services.AddHostedService<EngagementsStartupWorker>();
builder.Services.AddHostedService<EngagementsDemoSeedWorker>();
builder.Services.AddHostedService<EngagementsDemoDepthWorker>();
builder.Services.AddHostedService<EngagementsDemoConnectedStoryWorker>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (app.Environment.IsDevelopment())
    {
        var organizationKey =
            context.Request.Headers[KingdomIdentity.DemoOrganizationHeader].FirstOrDefault()
            ?? context.Request.Cookies[KingdomIdentity.DemoOrganizationCookie]
            ?? "ctg";
        if (!KingdomIdentity.TryResolveDevelopmentOrganization(
                organizationKey,
                out var resolvedOrganizationKey,
                out _))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "The selected demo organization is not available."
            });
            return;
        }

        context.User = KingdomIdentity.CreateDevelopmentPrincipal(resolvedOrganizationKey);
    }
    await next();
});
app.UseMiddleware<EngagementsReadinessMiddleware>();
app.UseMiddleware<EngagementsEntitlementMiddleware>();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    var assignmentMutation =
        context.Request.Path.StartsWithSegments("/api/engagements/assignments") &&
        !HttpMethods.IsGet(context.Request.Method) &&
        !HttpMethods.IsHead(context.Request.Method) &&
        !HttpMethods.IsOptions(context.Request.Method);
    if (assignmentMutation &&
        (context.User.Identity?.IsAuthenticated != true ||
         !KingdomIdentity.CanWriteEngagements(context.User)))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new
        {
            message = "Engagements write access is required for assignment changes."
        });
        return;
    }

    await next();
});
app.UseMiddleware<EngagementApprovalOperationsBridge>();

app.MapEngagementsHealth();
app.MapGet("/api/product", async (
    HttpContext context,
    IConfiguration configuration,
    EngagementsEntitlementResolver entitlements,
    CancellationToken cancellationToken) =>
{
    var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
    var careState = await entitlements.GetModuleStateAsync(
        "care",
        tenantId,
        allowDevelopmentBypass: false,
        cancellationToken);
    return Results.Ok(new
    {
        moduleKey = "engagements",
        shortName = "Engagements",
        name = "Kingdom Engagements",
        tenantName = configuration["KingdomOS:TenantName"] ?? "Cynthia Thompson Global",
        platformUrl = configuration["KingdomOS:PlatformBrowserUrl"] ?? "http://localhost:5100",
        careUrl = configuration["KingdomOS:CareBrowserUrl"] ?? "http://localhost:5104",
        careEnabled = careState == ModuleEntitlementState.Enabled,
        boundary = "Invitation intake, review, accepted terms, host coordination, travel, lodging, transportation, documents, readiness, event outcomes, follow-up, and closeout."
    });
});
app.MapGet("/api/capabilities", async (
    HttpContext context,
    EngagementsEntitlementResolver entitlements,
    CancellationToken cancellationToken) =>
{
    var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
    var state = await entitlements.GetStateAsync(tenantId, cancellationToken);
    return Results.Ok(new { engagementsEnabled = state == ModuleEntitlementState.Enabled, state = state.ToString() });
});

app.MapGet("/invite/apostle-cynthia", (IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "invite.html"), "text/html; charset=utf-8")).AllowAnonymous();
app.MapGet("/invite/apostle-cynthia/requests/{token}", (string token, IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "invite.html"), "text/html; charset=utf-8")).AllowAnonymous();
app.MapGet("/host/terms/{token}", (string token, IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "terms.html"), "text/html; charset=utf-8")).AllowAnonymous();
app.MapGet("/host/coordination/{token}", (string token, IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "coordination.html"), "text/html; charset=utf-8")).AllowAnonymous();

app.MapSpeakingRequestEndpoints();
app.MapEngagementPreparationEndpoints();
app.MapAssignmentWorkspaceEndpoints();
app.MapEngagementCompletionEndpoints();
app.MapEngagementsEndpoints();

// Keep the certified static client at / while the Angular application reaches parity.
// The new client is available side-by-side at /app and uses the same authenticated APIs.
app.MapGet("/app", (IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "app", "index.html"), "text/html; charset=utf-8"));
app.MapGet("/app/{*path}", (IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "app", "index.html"), "text/html; charset=utf-8"));

app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;
