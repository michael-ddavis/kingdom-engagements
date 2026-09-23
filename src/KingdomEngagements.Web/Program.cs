using System.Text.Json.Serialization;
using KingdomEngagements.Web.Features;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.AddApostolOSSecretSources();
builder.ValidateApostolOSProductionConfiguration();
builder.AddApostolOSObservability();

var provider = builder.Configuration["Database:Provider"] ?? "InMemory";
var connectionString = builder.Configuration.GetConnectionString("EngagementsDatabase");
var useSqlServer = provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase);
var useInMemory = provider.Equals("InMemory", StringComparison.OrdinalIgnoreCase);
var requireRelationalDatabase = builder.Configuration.GetValue("Database:RequireRelational", false);

if (!useSqlServer && !useInMemory)
{
    throw new InvalidOperationException(
        $"Unsupported Database:Provider '{provider}'. Use InMemory or SqlServer.");
}

if (requireRelationalDatabase && !useSqlServer)
{
    throw new InvalidOperationException(
        "Database:Provider must be SqlServer when Database:RequireRelational is enabled.");
}

void ConfigureSqlServer(SqlServerDbContextOptionsBuilder sql)
{
    var maxRetryCount = builder.Configuration.GetValue("Database:SqlServer:MaxRetryCount", 5);
    var maxRetryDelaySeconds = builder.Configuration.GetValue("Database:SqlServer:MaxRetryDelaySeconds", 10);
    var commandTimeoutSeconds = builder.Configuration.GetValue("Database:SqlServer:CommandTimeoutSeconds", 30);

    sql.EnableRetryOnFailure(
        maxRetryCount: Math.Max(0, maxRetryCount),
        maxRetryDelay: TimeSpan.FromSeconds(Math.Max(1, maxRetryDelaySeconds)),
        errorNumbersToAdd: null);
    sql.CommandTimeout(Math.Max(1, commandTimeoutSeconds));
}
builder.Services.AddDbContext<EngagementsDbContext>(options =>
{
    options.ReplaceService<IModelCustomizer, EngagementsModelCustomizer>();
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, ConfigureSqlServer);
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
        options.UseSqlServer(connectionString, ConfigureSqlServer);
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsSpeakingRequests");
});

builder.Services.AddDbContext<GlobalBookingDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, ConfigureSqlServer);
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsGlobalBookings");
});

builder.Services.AddDbContext<EngagementPreparationDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, ConfigureSqlServer);
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsPreparation");
});

builder.Services.AddDbContext<HostAccessDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, ConfigureSqlServer);
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsHostAccess");
});

builder.Services.AddDbContext<AssignmentWorkspaceDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:EngagementsDatabase is required for SQL Server.");
        options.UseSqlServer(connectionString, ConfigureSqlServer);
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
        options.UseSqlServer(connectionString, ConfigureSqlServer);
        return;
    }

    options.UseInMemoryDatabase("KingdomEngagementsCompletion");
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

builder.AddApostolOSDistributedRuntime();
builder.AddEngagementDocumentStorage();

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
    })
    .AddCookie(HostAccessIdentity.Scheme, options =>
    {
        options.Cookie.Name = ".ApostolOS.Host";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromHours(
            builder.Configuration.GetValue("KingdomOS:HostAccess:SessionLifetimeHours", 168));
        options.SlidingExpiration = false;
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
    options.AddPolicy("EngagementsAccess", policy => policy.RequireAssertion(context =>
        KingdomIdentity.HasEngagementsAccess(context.User)));
    options.AddPolicy("EngagementsWrite", policy => policy.RequireAssertion(context =>
        KingdomIdentity.CanWriteEngagements(context.User)));
    options.AddPolicy("EngagementsDirect", policy => policy.RequireAssertion(context =>
        KingdomIdentity.CanDirectEngagements(context.User)));
    options.AddPolicy(HostAccessIdentity.Policy, policy =>
    {
        policy.AddAuthenticationSchemes(HostAccessIdentity.Scheme);
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new HostAccessRequirement());
    });
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenantAccessor, CurrentTenantAccessor>();
builder.Services.AddSingleton<PublicInvitationTenantResolver>();
builder.Services.AddHttpClient<EngagementsEntitlementResolver>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(3);
});
builder.Services.AddHttpClient<EngagementTeamService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(3);
});
builder.Services.AddScoped<EngagementsInitializer>();
builder.Services.AddScoped<EngagementsService>();
builder.Services.AddScoped<EngagementResponsibilityService>();
builder.Services.AddScoped<EngagementLaneWorkspaceService>();
builder.Services.AddScoped<SpeakingRequestsService>();
builder.Services.AddScoped<StaffStartedInvitationsService>();
builder.Services.AddScoped<HickmanSpeakingRequestsService>();
builder.Services.AddScoped<EngagementPreparationService>();
builder.Services.AddScoped<HostAccessService>();
builder.Services.AddScoped<EngagementRealtimePublisher>();
builder.Services.AddScoped<IAuthorizationHandler, HostAccessAuthorizationHandler>();
builder.Services.AddScoped<AssignmentWorkspaceService>();
builder.Services.AddScoped<EngagementCompletionService>();
builder.Services.AddScoped<EngagementOperationsCoordinationPublisher>();
builder.Services.AddScoped<EngagementCareHandoffPublisher>();
builder.Services.AddSingleton<EngagementsStartupState>();
builder.Services.AddScoped<EngagementsDependencyHealth>();
builder.Services.AddHostedService<EngagementsStartupWorker>();
#if KINGDOM_ENGAGEMENTS_DEMO
builder.Services.AddHostedService<EngagementsDemoSeedWorker>();
builder.Services.AddHostedService<EngagementsDemoDepthWorker>();
builder.Services.AddHostedService<EngagementsDemoConnectedStoryWorker>();
#endif

var app = builder.Build();

app.UseMiddleware<ApostolOSRequestObservabilityMiddleware>();
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

var legacyHostTokenRoutesEnabled =
    app.Environment.IsDevelopment() &&
    app.Configuration.GetValue("KingdomOS:HostAccess:LegacyTokenRoutesEnabled", true);

app.Use(async (context, next) =>
{
    if (!legacyHostTokenRoutesEnabled &&
        context.Request.Path.StartsWithSegments("/api/public/engagements/preparation"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});

app.UseAuthentication();
#if KINGDOM_ENGAGEMENTS_DEMO
app.Use(async (context, next) =>
{
    var demoProfilesEnabled =
        app.Environment.IsDevelopment() &&
        app.Configuration.GetValue("KingdomOS:Identity:DemoProfilesEnabled", false);

    if (demoProfilesEnabled && context.User.Identity?.IsAuthenticated != true)
    {
        var organizationKey =
            context.Request.Headers[KingdomIdentity.DemoOrganizationHeader].FirstOrDefault()
            ?? context.Request.Cookies[KingdomIdentity.DemoOrganizationCookie]
            ?? "ctg";
        if (!KingdomIdentity.TryResolveDevelopmentOrganization(
                organizationKey,
                out var resolvedOrganizationKey,
                out var resolvedTenantId))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "The selected demo organization is not available."
            });
            return;
        }

        var demoRole = EngagementsDemoRoles.Resolve(context.Request);
        context.User = EngagementsDemoRoles.CreateDevelopmentPrincipal(
            resolvedOrganizationKey,
            resolvedTenantId,
            demoRole);
    }

    await next();
});
#endif
app.UseMiddleware<TenantContextMiddleware>();
app.UseMiddleware<EngagementsReadinessMiddleware>();
app.UseMiddleware<EngagementsEntitlementMiddleware>();
app.UseAuthorization();
#if KINGDOM_ENGAGEMENTS_DEMO
app.UseMiddleware<EngagementsDemoAccessMiddleware>();
#endif
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? string.Empty;
    var laneProgressMutation =
        path.StartsWith("/api/engagements/assignments/", StringComparison.OrdinalIgnoreCase) &&
        path.Contains("/responsibilities/", StringComparison.OrdinalIgnoreCase) &&
        path.EndsWith("/progress", StringComparison.OrdinalIgnoreCase);
    var responsibilityTaskMutation =
        HttpMethods.IsPut(context.Request.Method) &&
        path.StartsWith("/api/engagements/assignments/", StringComparison.OrdinalIgnoreCase) &&
        path.Contains("/tasks/", StringComparison.OrdinalIgnoreCase);
    var laneWorkspaceMutation =
        path.StartsWith("/api/engagements/assignments/", StringComparison.OrdinalIgnoreCase) &&
        path.Contains("/lanes/", StringComparison.OrdinalIgnoreCase);
    var hostConversationMutation =
        path.StartsWith("/api/engagements/assignments/", StringComparison.OrdinalIgnoreCase) &&
        path.EndsWith("/preparation/messages", StringComparison.OrdinalIgnoreCase);
    var assignmentMutation =
        context.Request.Path.StartsWithSegments("/api/engagements/assignments") &&
        !laneProgressMutation &&
        !responsibilityTaskMutation &&
        !laneWorkspaceMutation &&
        !hostConversationMutation &&
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
// Keep the approval bridge outside the Hickman review interceptor so an accepted
// Pastor Hickman invitation still publishes its downstream Operations preparation work.
app.UseMiddleware<EngagementApprovalOperationsBridge>();
app.UseMiddleware<HickmanSpeakingRequestReviewMiddleware>();

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
app.MapGet("/invite/pastor-hickman", (IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "invite-hickman.html"), "text/html; charset=utf-8")).AllowAnonymous();
app.MapGet("/invite/pastor-hickman/requests/{token}", (string token, IWebHostEnvironment environment) =>
    Results.File(Path.Combine(environment.WebRootPath, "invite-hickman.html"), "text/html; charset=utf-8")).AllowAnonymous();
if (legacyHostTokenRoutesEnabled)
{
    app.MapGet("/host/terms/{token}", (string token, IWebHostEnvironment environment) =>
        Results.File(Path.Combine(environment.WebRootPath, "terms.html"), "text/html; charset=utf-8")).AllowAnonymous();
    app.MapGet("/host/coordination/{token}", (string token, IWebHostEnvironment environment) =>
        Results.File(Path.Combine(environment.WebRootPath, "coordination.html"), "text/html; charset=utf-8")).AllowAnonymous();
}

app.MapGlobalBookingDeskEndpoints();
app.MapStaffStartedInvitationEndpoints();
app.MapSpeakingRequestEndpoints();
app.MapHickmanSpeakingRequestEndpoints();
app.MapHostAccessEndpoints();
app.MapEngagementPreparationEndpoints();
app.MapHub<EngagementRealtimeHub>(
        EngagementRealtimeHub.InternalRoute,
        options => options.CloseOnAuthenticationExpiration = true)
    .RequireAuthorization();

app.MapHub<EngagementRealtimeHub>(
        EngagementRealtimeHub.HostRoute,
        options => options.CloseOnAuthenticationExpiration = true)
    .RequireAuthorization(HostAccessIdentity.Policy);
app.MapAssignmentWorkspaceEndpoints();
app.MapEngagementCompletionEndpoints();
app.MapEngagementsDemoAccessEndpoints();
app.MapEngagementResponsibilityEndpoints();
app.MapEngagementTeamEndpoints();
app.MapEngagementLaneWorkspaceEndpoints();
app.MapEngagementsEndpoints();

// Preserve legacy /app links while sending each demo persona to the right workspace.
app.MapGet("/app", (HttpContext context) =>
{
    var target = EngagementsDemoRoles.IsApostle(context.User)
        ? "/organization/ctg/apostle"
        : EngagementsDemoRoles.IsMinister(context.User)
            ? "/assignments"
            : "/organization/ctg/bookings";
    return Results.Redirect($"{target}{context.Request.QueryString}");
});
app.MapGet("/app/{*path}", (string? path, HttpRequest request) =>
{
    var canonicalPath = string.IsNullOrWhiteSpace(path)
        ? "/organization/ctg/bookings"
        : $"/{path.TrimStart('/')}";

    return Results.Redirect($"{canonicalPath}{request.QueryString}");
});

app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;