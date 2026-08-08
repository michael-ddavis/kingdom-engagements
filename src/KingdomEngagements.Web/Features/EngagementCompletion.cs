using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementCompletionDbContext(DbContextOptions<EngagementCompletionDbContext> options) : DbContext(options)
{
    public DbSet<MinistryResponseRecord> Responses => Set<MinistryResponseRecord>();
    public DbSet<EngagementCloseoutRecord> Closeouts => Set<EngagementCloseoutRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var response = modelBuilder.Entity<MinistryResponseRecord>();
        response.ToTable("EngagementMinistryResponses");
        response.HasKey(x => x.Id);
        response.Property(x => x.Id).ValueGeneratedNever();
        response.HasIndex(x => new { x.TenantId, x.AssignmentId });
        response.Property(x => x.Type).HasMaxLength(60).IsRequired();
        response.Property(x => x.PersonName).HasMaxLength(180);
        response.Property(x => x.Email).HasMaxLength(320);
        response.Property(x => x.Phone).HasMaxLength(60);
        response.Property(x => x.Notes).HasMaxLength(4000);
        response.Property(x => x.FollowUpStatus).HasMaxLength(40).IsRequired();
        response.Property(x => x.FollowUpOwner).HasMaxLength(180);
        response.Property(x => x.FollowUpNotes).HasMaxLength(4000);

        var closeout = modelBuilder.Entity<EngagementCloseoutRecord>();
        closeout.ToTable("EngagementCloseouts");
        closeout.HasKey(x => x.Id);
        closeout.Property(x => x.Id).ValueGeneratedNever();
        closeout.HasIndex(x => new { x.TenantId, x.AssignmentId }).IsUnique();
        closeout.Property(x => x.EventNotes).HasMaxLength(4000);
        closeout.Property(x => x.TestimonySummary).HasMaxLength(4000);
        closeout.Property(x => x.HostFollowUpNotes).HasMaxLength(4000);
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
IF OBJECT_ID(N'[dbo].[EngagementMinistryResponses]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementMinistryResponses] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [AssignmentId] uniqueidentifier NOT NULL,
        [Type] nvarchar(60) NOT NULL,
        [Count] int NOT NULL,
        [PersonName] nvarchar(180) NULL,
        [Email] nvarchar(320) NULL,
        [Phone] nvarchar(60) NULL,
        [Notes] nvarchar(4000) NULL,
        [RequiresFollowUp] bit NOT NULL,
        [FollowUpStatus] nvarchar(40) NOT NULL,
        [FollowUpOwner] nvarchar(180) NULL,
        [FollowUpDueAtUtc] datetimeoffset NULL,
        [FollowUpNotes] nvarchar(4000) NULL,
        [FollowUpCompletedAtUtc] datetimeoffset NULL,
        [CreatedAtUtc] datetimeoffset NOT NULL,
        [UpdatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementMinistryResponses] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_EngagementMinistryResponses_TenantId_AssignmentId]
        ON [dbo].[EngagementMinistryResponses] ([TenantId], [AssignmentId]);
END;

IF OBJECT_ID(N'[dbo].[EngagementCloseouts]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementCloseouts] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [AssignmentId] uniqueidentifier NOT NULL,
        [EventNotes] nvarchar(4000) NULL,
        [TestimonySummary] nvarchar(4000) NULL,
        [HostFollowUpComplete] bit NOT NULL,
        [HostFollowUpNotes] nvarchar(4000) NULL,
        [FinalDocumentsComplete] bit NOT NULL,
        [PaymentComplete] bit NOT NULL,
        [AdministrativeFollowUpComplete] bit NOT NULL,
        [OutcomesRecorded] bit NOT NULL,
        [CompletedAtUtc] datetimeoffset NULL,
        [UpdatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementCloseouts] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_EngagementCloseouts_TenantId_AssignmentId]
        ON [dbo].[EngagementCloseouts] ([TenantId], [AssignmentId]);
END;
""";
        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class MinistryResponseRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; } = 1;
    public string? PersonName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public bool RequiresFollowUp { get; set; }
    public string FollowUpStatus { get; set; } = "not-required";
    public string? FollowUpOwner { get; set; }
    public DateTimeOffset? FollowUpDueAtUtc { get; set; }
    public string? FollowUpNotes { get; set; }
    public DateTimeOffset? FollowUpCompletedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class EngagementCloseoutRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid AssignmentId { get; set; }
    public string? EventNotes { get; set; }
    public string? TestimonySummary { get; set; }
    public bool HostFollowUpComplete { get; set; }
    public string? HostFollowUpNotes { get; set; }
    public bool FinalDocumentsComplete { get; set; }
    public bool PaymentComplete { get; set; }
    public bool AdministrativeFollowUpComplete { get; set; }
    public bool OutcomesRecorded { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed record CreateMinistryResponseRequest(string Type, int Count, string? PersonName, string? Email, string? Phone, string? Notes, bool RequiresFollowUp, string? FollowUpOwner, DateTimeOffset? FollowUpDueAtUtc);
public sealed record UpdateFollowUpRequest(string Status, string? Owner, DateTimeOffset? DueAtUtc, string? Notes);
public sealed record UpdateCloseoutRequest(string? EventNotes, string? TestimonySummary, bool HostFollowUpComplete, string? HostFollowUpNotes, bool FinalDocumentsComplete, bool PaymentComplete, bool AdministrativeFollowUpComplete, bool OutcomesRecorded, bool Complete);

public sealed record MinistryResponseDto(Guid Id, string Type, int Count, string? PersonName, string? Email, string? Phone, string? Notes, bool RequiresFollowUp, string FollowUpStatus, string? FollowUpOwner, DateTimeOffset? FollowUpDueAtUtc, string? FollowUpNotes, DateTimeOffset? FollowUpCompletedAtUtc, DateTimeOffset CreatedAtUtc);
public sealed record CloseoutDto(string? EventNotes, string? TestimonySummary, bool HostFollowUpComplete, string? HostFollowUpNotes, bool FinalDocumentsComplete, bool PaymentComplete, bool AdministrativeFollowUpComplete, bool OutcomesRecorded, bool AllFollowUpsComplete, bool AllReadinessTasksResolved, DateTimeOffset? CompletedAtUtc);
public sealed record EngagementCompletionDetails(IReadOnlyList<MinistryResponseDto> Responses, CloseoutDto Closeout, int TotalResponses, int FollowUpsOpen, bool CanComplete);

public sealed class EngagementCompletionService(EngagementCompletionDbContext database, EngagementsDbContext engagementsDatabase)
{
    private static readonly HashSet<string> ResponseTypes = new(StringComparer.OrdinalIgnoreCase)
    { "salvation", "recommitment", "prayer-request", "healing-testimony", "discipleship", "pastoral-follow-up", "ministry-interest", "other" };
    private static readonly HashSet<string> FollowUpStatuses = new(StringComparer.OrdinalIgnoreCase)
    { "needs-follow-up", "assigned", "in-progress", "completed", "not-required" };

    public async Task<EngagementCompletionDetails?> GetAsync(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        if (!await AssignmentExists(tenantId, assignmentId, cancellationToken)) return null;
        var closeout = await EnsureCloseoutAsync(tenantId, assignmentId, cancellationToken);
        var responses = await database.Responses.AsNoTracking().Where(x => x.TenantId == tenantId && x.AssignmentId == assignmentId)
            .OrderByDescending(x => x.CreatedAtUtc).ToListAsync(cancellationToken);
        return await MapAsync(tenantId, assignmentId, closeout, responses, cancellationToken);
    }

    public async Task<EngagementCompletionDetails?> AddResponseAsync(Guid tenantId, Guid assignmentId, CreateMinistryResponseRequest input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        if (!await AssignmentExists(tenantId, assignmentId, cancellationToken)) return null;
        var type = Required(input.Type, nameof(input.Type)).ToLowerInvariant();
        if (!ResponseTypes.Contains(type)) throw new ArgumentException("Choose a supported ministry response type.");
        if (input.Count < 1) throw new ArgumentException("Response count must be at least 1.");
        var now = DateTimeOffset.UtcNow;
        var item = new MinistryResponseRecord
        {
            Id = Guid.NewGuid(), TenantId = tenantId, AssignmentId = assignmentId, Type = type, Count = input.Count,
            PersonName = Trim(input.PersonName), Email = Trim(input.Email)?.ToLowerInvariant(), Phone = Trim(input.Phone), Notes = Trim(input.Notes),
            RequiresFollowUp = input.RequiresFollowUp,
            FollowUpStatus = input.RequiresFollowUp ? "needs-follow-up" : "not-required",
            FollowUpOwner = Trim(input.FollowUpOwner), FollowUpDueAtUtc = input.FollowUpDueAtUtc,
            CreatedAtUtc = now, UpdatedAtUtc = now
        };
        database.Responses.Add(item);
        await database.SaveChangesAsync(cancellationToken);
        return await GetAsync(tenantId, assignmentId, cancellationToken);
    }

    public async Task<EngagementCompletionDetails?> UpdateFollowUpAsync(Guid tenantId, Guid assignmentId, Guid responseId, UpdateFollowUpRequest input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var response = await database.Responses.SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.Id == responseId, cancellationToken);
        if (response is null) return null;
        var status = Required(input.Status, nameof(input.Status)).ToLowerInvariant();
        if (!FollowUpStatuses.Contains(status)) throw new ArgumentException("Choose a valid follow-up status.");
        if (!response.RequiresFollowUp && status != "not-required") response.RequiresFollowUp = true;
        response.FollowUpStatus = status;
        response.FollowUpOwner = Trim(input.Owner);
        response.FollowUpDueAtUtc = input.DueAtUtc;
        response.FollowUpNotes = Trim(input.Notes);
        response.FollowUpCompletedAtUtc = status == "completed" ? DateTimeOffset.UtcNow : null;
        response.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        return await GetAsync(tenantId, assignmentId, cancellationToken);
    }

    public async Task<EngagementCompletionDetails?> UpdateCloseoutAsync(Guid tenantId, Guid assignmentId, UpdateCloseoutRequest input, CancellationToken cancellationToken)
    {
        await database.EnsureSchemaAsync(cancellationToken);
        var assignment = await engagementsDatabase.Assignments.Include(x => x.Tasks).SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        if (assignment is null) return null;
        var closeout = await EnsureCloseoutAsync(tenantId, assignmentId, cancellationToken);
        closeout.EventNotes = Trim(input.EventNotes);
        closeout.TestimonySummary = Trim(input.TestimonySummary);
        closeout.HostFollowUpComplete = input.HostFollowUpComplete;
        closeout.HostFollowUpNotes = Trim(input.HostFollowUpNotes);
        closeout.FinalDocumentsComplete = input.FinalDocumentsComplete;
        closeout.PaymentComplete = input.PaymentComplete;
        closeout.AdministrativeFollowUpComplete = input.AdministrativeFollowUpComplete;
        closeout.OutcomesRecorded = input.OutcomesRecorded;
        closeout.UpdatedAtUtc = DateTimeOffset.UtcNow;

        var followUpsOpen = await database.Responses.AnyAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId && x.RequiresFollowUp && x.FollowUpStatus != "completed", cancellationToken);
        var tasksOpen = assignment.Tasks.Any(x => !IsResolved(x.Status));
        var requirementsMet = input.HostFollowUpComplete && input.FinalDocumentsComplete && input.PaymentComplete && input.AdministrativeFollowUpComplete && input.OutcomesRecorded && !followUpsOpen && !tasksOpen;
        if (input.Complete && !requirementsMet)
            throw new InvalidOperationException("Closeout cannot be completed until host follow-up, documents, payment/admin work, outcomes, follow-ups, and assignment tasks are resolved.");

        if (input.Complete)
        {
            closeout.CompletedAtUtc ??= DateTimeOffset.UtcNow;
            assignment.CloseoutStatus = "complete";
            assignment.Status = "complete";
        }
        else
        {
            closeout.CompletedAtUtc = null;
            assignment.CloseoutStatus = requirementsMet ? "confirmed" : "in-progress";
        }
        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        await engagementsDatabase.SaveChangesAsync(cancellationToken);
        return await GetAsync(tenantId, assignmentId, cancellationToken);
    }

    private async Task<EngagementCloseoutRecord> EnsureCloseoutAsync(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken)
    {
        var existing = await database.Closeouts.SingleOrDefaultAsync(x => x.TenantId == tenantId && x.AssignmentId == assignmentId, cancellationToken);
        if (existing is not null) return existing;
        var created = new EngagementCloseoutRecord { Id = Guid.NewGuid(), TenantId = tenantId, AssignmentId = assignmentId, UpdatedAtUtc = DateTimeOffset.UtcNow };
        database.Closeouts.Add(created);
        await database.SaveChangesAsync(cancellationToken);
        return created;
    }

    private async Task<EngagementCompletionDetails> MapAsync(Guid tenantId, Guid assignmentId, EngagementCloseoutRecord closeout, IReadOnlyList<MinistryResponseRecord> responses, CancellationToken cancellationToken)
    {
        var assignment = await engagementsDatabase.Assignments.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);
        var followUpsOpen = responses.Count(x => x.RequiresFollowUp && x.FollowUpStatus != "completed");
        var tasksResolved = assignment.Tasks.All(x => IsResolved(x.Status));
        var allFollowUpsComplete = followUpsOpen == 0;
        var canComplete = closeout.HostFollowUpComplete && closeout.FinalDocumentsComplete && closeout.PaymentComplete && closeout.AdministrativeFollowUpComplete && closeout.OutcomesRecorded && allFollowUpsComplete && tasksResolved;
        var dto = new CloseoutDto(closeout.EventNotes, closeout.TestimonySummary, closeout.HostFollowUpComplete, closeout.HostFollowUpNotes,
            closeout.FinalDocumentsComplete, closeout.PaymentComplete, closeout.AdministrativeFollowUpComplete, closeout.OutcomesRecorded,
            allFollowUpsComplete, tasksResolved, closeout.CompletedAtUtc);
        return new EngagementCompletionDetails(responses.Select(Map).ToArray(), dto, responses.Sum(x => x.Count), followUpsOpen, canComplete);
    }

    private async Task<bool> AssignmentExists(Guid tenantId, Guid assignmentId, CancellationToken cancellationToken) =>
        await engagementsDatabase.Assignments.AsNoTracking().AnyAsync(x => x.TenantId == tenantId && x.Id == assignmentId, cancellationToken);

    private static MinistryResponseDto Map(MinistryResponseRecord x) => new(x.Id, x.Type, x.Count, x.PersonName, x.Email, x.Phone, x.Notes, x.RequiresFollowUp, x.FollowUpStatus, x.FollowUpOwner, x.FollowUpDueAtUtc, x.FollowUpNotes, x.FollowUpCompletedAtUtc, x.CreatedAtUtc);
    private static bool IsResolved(string status) => status is "complete" or "confirmed" or "received" or "waived";
    private static string Required(string? value, string field) => string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();
    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static class EngagementCompletionEndpoints
{
    public static IEndpointRouteBuilder MapEngagementCompletionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements/assignments").RequireAuthorization();
        group.MapGet("/{id:guid}/completion", async (Guid id, HttpContext context, EngagementCompletionService service, CancellationToken ct) =>
        {
            var item = await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });
        group.MapPost("/{id:guid}/responses", async (Guid id, CreateMinistryResponseRequest request, HttpContext context, EngagementCompletionService service, CancellationToken ct) =>
        {
            try { var item = await service.AddResponseAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request, ct); return item is null ? Results.NotFound() : Results.Ok(item); }
            catch (ArgumentException ex) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["response"] = [ex.Message] }); }
        });
        group.MapPut("/{id:guid}/responses/{responseId:guid}/follow-up", async (Guid id, Guid responseId, UpdateFollowUpRequest request, HttpContext context, EngagementCompletionService service, CancellationToken ct) =>
        {
            try { var item = await service.UpdateFollowUpAsync(KingdomIdentity.TenantId(context.User, context.Request), id, responseId, request, ct); return item is null ? Results.NotFound() : Results.Ok(item); }
            catch (ArgumentException ex) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["followUp"] = [ex.Message] }); }
        });
        group.MapPut("/{id:guid}/closeout", async (Guid id, UpdateCloseoutRequest request, HttpContext context, EngagementCompletionService service, CancellationToken ct) =>
        {
            try { var item = await service.UpdateCloseoutAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request, ct); return item is null ? Results.NotFound() : Results.Ok(item); }
            catch (InvalidOperationException ex) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["closeout"] = [ex.Message] }); }
        });
        return endpoints;
    }
}
