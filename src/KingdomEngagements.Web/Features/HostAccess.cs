using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using KingdomEngagements.Web.Platform;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public static class HostAccessIdentity
{
    public const string Scheme = "ApostolOS.Host";
    public const string Policy = "HostEngagementAccess";
    public const string AccessIdClaim = "apostolos.host_access_id";
    public const string TenantIdClaim = ApostolOSTenantClaims.HostTenantClaim;
    public const string AssignmentIdClaim = "apostolos.assignment_id";
    public const string EmailClaim = "apostolos.host_email";

    public static Guid? AccessId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AccessIdClaim), out var value) ? value : null;

    public static Guid? TenantId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(TenantIdClaim), out var value) ? value : null;

    public static Guid? AssignmentId(ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AssignmentIdClaim), out var value) ? value : null;

    public static string DisplayName(ClaimsPrincipal user) =>
        user.Identity?.Name?.Trim() is { Length: > 0 } name ? name : "Host";
}

public sealed class HostAccessRequirement : IAuthorizationRequirement
{
}

public sealed class HostAccessAuthorizationHandler(HostAccessDbContext database)
    : AuthorizationHandler<HostAccessRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        HostAccessRequirement requirement)
    {
        var accessId = HostAccessIdentity.AccessId(context.User);
        var tenantId = HostAccessIdentity.TenantId(context.User);
        var assignmentId = HostAccessIdentity.AssignmentId(context.User);

        if (accessId is null || tenantId is null || assignmentId is null)
            return;

        var now = DateTimeOffset.UtcNow;
        var isActive = await database.Invitations.AsNoTracking().AnyAsync(invitation =>
            invitation.Id == accessId.Value &&
            invitation.TenantId == tenantId.Value &&
            invitation.AssignmentId == assignmentId.Value &&
            invitation.RedeemedAtUtc != null &&
            invitation.RevokedAtUtc == null &&
            invitation.ExpiresAtUtc > now);

        if (isActive)
            context.Succeed(requirement);
    }
}

public sealed class HostAccessDbContext(
    DbContextOptions<HostAccessDbContext> options,
    ICurrentTenantAccessor currentTenant)
    : TenantScopedDbContext(options, currentTenant)
{
    public DbSet<HostAccessInvitationRecord> Invitations => Set<HostAccessInvitationRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var invitation = modelBuilder.Entity<HostAccessInvitationRecord>();
        invitation.ToTable("EngagementHostAccessInvitations");
        invitation.HasKey(x => x.Id);
        invitation.Property(x => x.Id).ValueGeneratedNever();
        invitation.Property(x => x.HostName).HasMaxLength(180).IsRequired();
        invitation.Property(x => x.HostEmail).HasMaxLength(320);
        invitation.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        invitation.HasIndex(x => x.TokenHash).IsUnique();
        invitation.HasIndex(x => new { x.TenantId, x.AssignmentId, x.CreatedAtUtc });
        invitation.HasQueryFilter(x => TenantIsolationBypassed || x.TenantId == CurrentTenantId);
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
DECLARE @lockResult int;

EXEC @lockResult = sys.sp_getapplock
    @Resource = N'KingdomEngagements:HostAccessInvitations:Schema',
    @LockMode = N'Exclusive',
    @LockOwner = N'Session',
    @LockTimeout = 10000;

IF @lockResult < 0
    THROW 51000, 'Could not acquire the host access schema lock.', 1;

BEGIN TRY
    IF OBJECT_ID(N'[dbo].[EngagementHostAccessInvitations]', N'U') IS NULL
    BEGIN
        CREATE TABLE [dbo].[EngagementHostAccessInvitations] (
            [Id] uniqueidentifier NOT NULL,
            [TenantId] uniqueidentifier NOT NULL,
            [AssignmentId] uniqueidentifier NOT NULL,
            [HostName] nvarchar(180) NOT NULL,
            [HostEmail] nvarchar(320) NULL,
            [TokenHash] nvarchar(64) NOT NULL,
            [CreatedAtUtc] datetimeoffset NOT NULL,
            [ExpiresAtUtc] datetimeoffset NOT NULL,
            [RedeemedAtUtc] datetimeoffset NULL,
            [RevokedAtUtc] datetimeoffset NULL,
            CONSTRAINT [PK_EngagementHostAccessInvitations] PRIMARY KEY ([Id])
        );

        CREATE UNIQUE INDEX [IX_EngagementHostAccessInvitations_TokenHash]
            ON [dbo].[EngagementHostAccessInvitations] ([TokenHash]);

        CREATE INDEX [IX_EngagementHostAccessInvitations_TenantId_AssignmentId_CreatedAtUtc]
            ON [dbo].[EngagementHostAccessInvitations] ([TenantId], [AssignmentId], [CreatedAtUtc]);
    END;

    EXEC sys.sp_releaseapplock
        @Resource = N'KingdomEngagements:HostAccessInvitations:Schema',
        @LockOwner = N'Session';
END TRY
BEGIN CATCH
    EXEC sys.sp_releaseapplock
        @Resource = N'KingdomEngagements:HostAccessInvitations:Schema',
        @LockOwner = N'Session';
    THROW;
END CATCH;
""";

        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class HostAccessInvitationRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string HostName { get; set; } = string.Empty;
    public string? HostEmail { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? RedeemedAtUtc { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
}

public sealed record IssuedHostAccessInvitation(
    Guid Id,
    string Token,
    string HostName,
    string? HostEmail,
    DateTimeOffset ExpiresAtUtc);

public sealed record HostAccessSession(
    Guid AccessId,
    Guid TenantId,
    Guid AssignmentId,
    string HostName,
    string? HostEmail,
    bool TermsAccepted,
    DateTimeOffset ExpiresAtUtc);

public sealed record HostAccessStatus(
    bool HasAccess,
    bool IsRedeemed,
    string HostName,
    string? HostEmail,
    DateTimeOffset? CreatedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset? RedeemedAtUtc,
    DateTimeOffset? RevokedAtUtc);

public sealed record HostPreparationAccess(
    Guid TenantId,
    Guid AssignmentId,
    string TermsToken,
    string CoordinationToken,
    string TermsStatus);

public sealed record PostAuthenticatedHostMessageRequest(string Message);

public sealed class HostAccessService(
    HostAccessDbContext database,
    EngagementPreparationDbContext preparationDatabase,
    EngagementsDbContext engagementsDatabase,
    IConfiguration configuration,
    ICurrentTenantAccessor currentTenant,
    ITenantIsolationBypass tenantBypass)
{
    private const int TokenBytes = 32;
    private const int DefaultInvitationLifetimeHours = 168;
    private const int DefaultSessionLifetimeHours = 168;

    public async Task<IssuedHostAccessInvitation?> IssueAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        using var tenantScope = currentTenant.BeginTenantScope(
            tenantId,
            "Access host invitation records for the requested engagement tenant.");
        await database.EnsureSchemaAsync(cancellationToken);

        var assignment = await engagementsDatabase.Assignments.AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.TenantId == tenantId && x.Id == assignmentId,
                cancellationToken);

        if (assignment is null)
            return null;

        var now = DateTimeOffset.UtcNow;

        // Issuing a new link intentionally invalidates earlier links and active host sessions.
        // This gives staff one predictable way to rotate access if a link is forwarded or lost.
        var previousInvitations = await database.Invitations
            .Where(x =>
                x.TenantId == tenantId &&
                x.AssignmentId == assignmentId &&
                x.RevokedAtUtc == null &&
                x.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var invitation in previousInvitations)
            invitation.RevokedAtUtc = now;

        var token = CreateToken();
        var invitationLifetimeHours = configuration.GetValue(
            "KingdomOS:HostAccess:InvitationLifetimeHours",
            DefaultInvitationLifetimeHours);

        var record = new HostAccessInvitationRecord
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssignmentId = assignmentId,
            HostName = RequiredHostName(assignment),
            HostEmail = NormalizeEmail(assignment.HostContactEmail),
            TokenHash = HashToken(token),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(Math.Max(1, invitationLifetimeHours))
        };

        database.Invitations.Add(record);
        await database.SaveChangesAsync(cancellationToken);

        return new IssuedHostAccessInvitation(
            record.Id,
            token,
            record.HostName,
            record.HostEmail,
            record.ExpiresAtUtc);
    }

    public async Task<HostAccessSession?> RedeemAsync(
        string token,
        CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        await preparationDatabase.EnsureSchemaAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(token))
            return null;

        var tokenHash = HashToken(token);
        Guid? owningTenantId;

        using (tenantBypass.BeginBypass(
                   "Resolve a one-time host invitation token to its owning tenant."))
        {
            owningTenantId = await database.Invitations.AsNoTracking()
                .Where(x => x.TokenHash == tokenHash)
                .Select(x => (Guid?)x.TenantId)
                .SingleOrDefaultAsync(cancellationToken);
        }

        if (owningTenantId is null)
            return null;

        using var tenantScope = currentTenant.BeginTenantScope(
            owningTenantId.Value,
            "Redeem host invitation inside its owning tenant.");

        var now = DateTimeOffset.UtcNow;
        var invitation = await database.Invitations.SingleOrDefaultAsync(
            x => x.TokenHash == tokenHash,
            cancellationToken);

        if (invitation is null ||
            invitation.RevokedAtUtc is not null ||
            invitation.RedeemedAtUtc is not null ||
            invitation.ExpiresAtUtc <= now)
        {
            return null;
        }

        var preparation = await preparationDatabase.Preparations.AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.TenantId == invitation.TenantId &&
                    x.AssignmentId == invitation.AssignmentId,
                cancellationToken);

        if (preparation is null)
            return null;

        invitation.RedeemedAtUtc = now;
        await database.SaveChangesAsync(cancellationToken);

        var sessionLifetimeHours = configuration.GetValue(
            "KingdomOS:HostAccess:SessionLifetimeHours",
            DefaultSessionLifetimeHours);

        var sessionExpiresAt = now.AddHours(Math.Max(1, sessionLifetimeHours));
        if (sessionExpiresAt > invitation.ExpiresAtUtc)
            sessionExpiresAt = invitation.ExpiresAtUtc;

        return new HostAccessSession(
            invitation.Id,
            invitation.TenantId,
            invitation.AssignmentId,
            invitation.HostName,
            invitation.HostEmail,
            preparation.TermsStatus == "accepted",
            sessionExpiresAt);
    }

    public async Task<HostAccessStatus> GetStatusAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        using var tenantScope = currentTenant.BeginTenantScope(
            tenantId,
            "Access host invitation records for the requested engagement tenant.");
        await database.EnsureSchemaAsync(cancellationToken);

        var latest = await database.Invitations.AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is null)
            return new HostAccessStatus(false, false, string.Empty, null, null, null, null, null);

        var now = DateTimeOffset.UtcNow;
        var hasAccess = latest.RevokedAtUtc is null && latest.ExpiresAtUtc > now;

        return new HostAccessStatus(
            hasAccess,
            hasAccess && latest.RedeemedAtUtc is not null,
            latest.HostName,
            latest.HostEmail,
            latest.CreatedAtUtc,
            latest.ExpiresAtUtc,
            latest.RedeemedAtUtc,
            latest.RevokedAtUtc);
    }

    public async Task<bool> RevokeAsync(
        Guid tenantId,
        Guid assignmentId,
        CancellationToken cancellationToken)
    {
        using var tenantScope = currentTenant.BeginTenantScope(
            tenantId,
            "Access host invitation records for the requested engagement tenant.");
        await database.EnsureSchemaAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var invitations = await database.Invitations
            .Where(x =>
                x.TenantId == tenantId &&
                x.AssignmentId == assignmentId &&
                x.RevokedAtUtc == null &&
                x.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        if (invitations.Count == 0)
            return false;

        foreach (var invitation in invitations)
            invitation.RevokedAtUtc = now;

        await database.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<HostPreparationAccess?> ResolvePreparationAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        var tenantId = HostAccessIdentity.TenantId(user);
        var assignmentId = HostAccessIdentity.AssignmentId(user);

        if (tenantId is null || assignmentId is null)
            return null;

        await preparationDatabase.EnsureSchemaAsync(cancellationToken);

        return await preparationDatabase.Preparations.AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value && x.AssignmentId == assignmentId.Value)
            .Select(x => new HostPreparationAccess(
                x.TenantId,
                x.AssignmentId,
                x.TermsToken,
                x.CoordinationToken,
                x.TermsStatus))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public static ClaimsPrincipal CreatePrincipal(HostAccessSession session)
    {
        var claims = new List<Claim>
        {
            new(HostAccessIdentity.AccessIdClaim, session.AccessId.ToString()),
            new(HostAccessIdentity.TenantIdClaim, session.TenantId.ToString()),
            new(HostAccessIdentity.AssignmentIdClaim, session.AssignmentId.ToString()),
            new(ClaimTypes.Name, session.HostName)
        };

        if (!string.IsNullOrWhiteSpace(session.HostEmail))
        {
            claims.Add(new Claim(HostAccessIdentity.EmailClaim, session.HostEmail));
            claims.Add(new Claim(ClaimTypes.Email, session.HostEmail));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, HostAccessIdentity.Scheme));
    }

    private static string CreateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(TokenBytes);
        return WebEncoders.Base64UrlEncode(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(bytes);
    }

    private static string RequiredHostName(EngagementAssignment assignment)
    {
        if (!string.IsNullOrWhiteSpace(assignment.HostContactName))
            return assignment.HostContactName.Trim();

        if (!string.IsNullOrWhiteSpace(assignment.HostOrganization))
            return assignment.HostOrganization.Trim();

        return "Engagement host";
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
}

public static class HostAccessEndpoints
{
    public static IEndpointRouteBuilder MapHostAccessEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var staff = endpoints.MapGroup("/api/engagements/assignments")
            .RequireAuthorization("EngagementsDirect");

        staff.MapGet("/{id:guid}/host-access", async (
            Guid id,
            HttpContext context,
            HostAccessService hostAccess,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            return Results.Ok(await hostAccess.GetStatusAsync(tenantId, id, ct));
        });

        staff.MapPost("/{id:guid}/host-access/invitations", async (
            Guid id,
            HttpContext context,
            EngagementPreparationService preparationService,
            HostAccessService hostAccess,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);

            // Ensure the engagement has its preparation record before the host receives access.
            if (await preparationService.EnsureAsync(tenantId, id, ct) is null)
                return Results.NotFound(new { message = "The engagement could not be prepared for host access." });

            var invitation = await hostAccess.IssueAsync(tenantId, id, ct);
            if (invitation is null)
                return Results.NotFound(new { message = "The engagement was not found." });

            var configuredBaseUrl = configuration["KingdomOS:HostAccess:PublicBaseUrl"]?.TrimEnd('/');
            var publicBaseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl)
                ? $"{context.Request.Scheme}://{context.Request.Host}"
                : configuredBaseUrl;

            var invitationUrl = $"{publicBaseUrl}/host/access/{invitation.Token}";

            return Results.Ok(new
            {
                invitationUrl,
                invitation.ExpiresAtUtc,
                invitation.HostName,
                invitation.HostEmail
            });
        });

        staff.MapPost("/{id:guid}/host-access/revoke", async (
            Guid id,
            HttpContext context,
            HostAccessService hostAccess,
            CancellationToken ct) =>
        {
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var revoked = await hostAccess.RevokeAsync(tenantId, id, ct);
            return Results.Ok(new { revoked });
        });

        endpoints.MapGet("/host/access/{token}", (
            string token,
            HttpContext context) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Content(
                BuildRedemptionPage(token),
                "text/html; charset=utf-8");
        }).AllowAnonymous();

        endpoints.MapPost("/host/access/redeem", async (
            HttpContext context,
            HostAccessService hostAccess,
            CancellationToken ct) =>
        {
            if (!context.Request.HasFormContentType)
                return Results.BadRequest(new { message = "A host invitation token is required." });

            var form = await context.Request.ReadFormAsync(ct);
            var token = form["token"].FirstOrDefault();
            var session = await hostAccess.RedeemAsync(token ?? string.Empty, ct);

            if (session is null)
            {
                return Results.NotFound(new
                {
                    message = "This host invitation is invalid, expired, revoked, or has already been used."
                });
            }

            var principal = HostAccessService.CreatePrincipal(session);
            var properties = new AuthenticationProperties
            {
                IsPersistent = true,
                AllowRefresh = false,
                ExpiresUtc = session.ExpiresAtUtc
            };

            await context.SignInAsync(HostAccessIdentity.Scheme, principal, properties);
            context.Response.Headers.CacheControl = "no-store";

            return Results.Redirect(session.TermsAccepted ? "/host/coordination" : "/host/terms");
        }).AllowAnonymous().DisableAntiforgery();

        endpoints.MapGet("/host/terms", (IWebHostEnvironment environment) =>
            Results.File(
                Path.Combine(environment.WebRootPath, "terms.html"),
                "text/html; charset=utf-8"))
            .RequireAuthorization(HostAccessIdentity.Policy);

        endpoints.MapGet("/host/coordination", (IWebHostEnvironment environment) =>
            Results.File(
                Path.Combine(environment.WebRootPath, "coordination.html"),
                "text/html; charset=utf-8"))
            .RequireAuthorization(HostAccessIdentity.Policy);

        var host = endpoints.MapGroup("/api/host/engagement")
            .RequireAuthorization(HostAccessIdentity.Policy);

        host.MapGet("/terms", async (
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            CancellationToken ct) =>
        {
            var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
            if (access is null) return Results.Forbid();

            var terms = await preparationService.GetTermsAsync(access.TermsToken, ct);
            return terms is null
                ? Results.NotFound()
                : Results.Ok(terms with { CoordinationToken = null });
        });

        host.MapPost("/terms/accept", async (
            AcceptEngagementTermsRequest request,
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            EngagementRealtimePublisher realtime,
            CancellationToken ct) =>
        {
            try
            {
                var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
                if (access is null) return Results.Forbid();

                var terms = await preparationService.AcceptTermsAsync(access.TermsToken, request, ct);
                if (terms is null) return Results.NotFound();

                return Results.Ok(new
                {
                    terms = terms with { CoordinationToken = null },
                    coordinationUrl = "/host/coordination"
                });
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(
                    new Dictionary<string, string[]> { ["terms"] = [exception.Message] });
            }
        });

        host.MapGet("/coordination", async (
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            CancellationToken ct) =>
        {
            var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
            if (access is null) return Results.Forbid();

            var coordination = await preparationService.GetCoordinationAsync(
                access.CoordinationToken,
                ct);

            return coordination is null
                ? Results.NotFound(new { message = "Host coordination is not available yet." })
                : Results.Ok(coordination);
        });

        host.MapPut("/coordination", async (
            HostCoordinationUpdate request,
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            EngagementRealtimePublisher realtime,
            CancellationToken ct) =>
        {
            var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
            if (access is null) return Results.Forbid();

            var coordination = await preparationService.SaveCoordinationAsync(
                access.CoordinationToken,
                request,
                ct);

            if (coordination is null)
                return Results.NotFound(new { message = "Host coordination is not available." });

            await realtime.CoordinationUpdatedAsync(
                access.TenantId,
                access.AssignmentId,
                "host",
                coordination.CoordinationStatus,
                ct);

            return Results.Ok(coordination);
        });

        host.MapGet("/coordination/messages", async (
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            CancellationToken ct) =>
        {
            var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
            if (access is null) return Results.Forbid();

            var thread = await preparationService.GetMessagesForHostAsync(
                access.CoordinationToken,
                ct);

            return thread is null ? Results.NotFound() : Results.Ok(thread);
        });

        host.MapPost("/coordination/messages", async (
            PostAuthenticatedHostMessageRequest request,
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            EngagementRealtimePublisher realtime,
            CancellationToken ct) =>
        {
            try
            {
                var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
                if (access is null) return Results.Forbid();

                var thread = await preparationService.AddHostMessageAsync(
                    access.CoordinationToken,
                    new PostHostCoordinationMessageRequest(
                        HostAccessIdentity.DisplayName(context.User),
                        request.Message),
                    ct);

                if (thread is null) return Results.NotFound();

                var createdMessage = thread.Messages.LastOrDefault();
                if (createdMessage is not null)
                {
                    await realtime.MessageCreatedAsync(
                        access.TenantId,
                        access.AssignmentId,
                        createdMessage,
                        ct);
                }

                return Results.Ok(thread);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(
                    new Dictionary<string, string[]> { ["message"] = [exception.Message] });
            }
            catch (InvalidOperationException exception)
            {
                return Results.Conflict(new { message = exception.Message });
            }
        });

        host.MapPost("/coordination/documents", async (
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            EngagementRealtimePublisher realtime,
            CancellationToken ct) =>
        {
            try
            {
                var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
                if (access is null) return Results.Forbid();

                if (!context.Request.HasFormContentType)
                    return Results.BadRequest(new { message = "Upload a document using multipart form data." });

                var form = await context.Request.ReadFormAsync(ct);
                var file = form.Files.GetFile("file");
                if (file is null)
                    return Results.BadRequest(new { message = "Choose a file to upload." });

                await using var stream = new MemoryStream();
                await file.CopyToAsync(stream, ct);

                var document = await preparationService.AddDocumentAsync(
                    access.CoordinationToken,
                    file.FileName,
                    file.ContentType,
                    stream.ToArray(),
                    form["category"].FirstOrDefault(),
                    ct);

                if (document is null) return Results.NotFound();

                await realtime.DocumentAddedAsync(
                    access.TenantId,
                    access.AssignmentId,
                    "host",
                    document,
                    ct);

                return Results.Ok(document);
            }
            catch (ArgumentException exception)
            {
                return Results.ValidationProblem(
                    new Dictionary<string, string[]> { ["document"] = [exception.Message] });
            }
        }).DisableAntiforgery();

        host.MapGet("/coordination/documents/{documentId:guid}", async (
            Guid documentId,
            bool? download,
            HttpContext context,
            HostAccessService hostAccess,
            EngagementPreparationService preparationService,
            CancellationToken ct) =>
        {
            var access = await hostAccess.ResolvePreparationAsync(context.User, ct);
            if (access is null) return Results.Forbid();

            var document = await preparationService.GetDocumentForHostAsync(
                access.CoordinationToken,
                documentId,
                ct);

            if (document is null) return Results.NotFound();

            return download is true
                ? Results.File(
                    document.Content,
                    document.ContentType,
                    document.FileName,
                    enableRangeProcessing: true)
                : Results.File(
                    document.Content,
                    document.ContentType,
                    enableRangeProcessing: true);
        });

        endpoints.MapPost("/api/host/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(HostAccessIdentity.Scheme);
            return Results.NoContent();
        }).RequireAuthorization(HostAccessIdentity.Policy);

        return endpoints;
    }

    private static string BuildRedemptionPage(string token)
    {
        var encodedToken = HtmlEncoder.Default.Encode(token);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>ApostolOS Host Access</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f7f5ef; color: #182337; }
    main { max-width: 540px; margin: 10vh auto; padding: 32px; background: white; border: 1px solid #ded9cf; border-radius: 16px; }
    h1 { margin-top: 0; font-size: 1.5rem; }
    p { line-height: 1.6; color: #596579; }
    button { min-height: 44px; padding: 0 18px; border: 0; border-radius: 9px; background: #17365d; color: white; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>Continue to host coordination</h1>
    <p>This private invitation opens only the engagement shared with you. Continue when you are ready to review the engagement details.</p>
    <form method="post" action="/host/access/redeem">
      <input type="hidden" name="token" value="{{encodedToken}}" />
      <button type="submit">Continue to engagement</button>
    </form>
  </main>
</body>
</html>
""";
    }
}
