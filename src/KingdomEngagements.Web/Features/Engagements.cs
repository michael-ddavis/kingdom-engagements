using System.Text.Json;
using System.Net;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class EngagementsDbContext(DbContextOptions<EngagementsDbContext> options)
    : DbContext(options)
{
    public DbSet<EngagementAssignment> Assignments => Set<EngagementAssignment>();
    public DbSet<EngagementTask> Tasks => Set<EngagementTask>();
    public DbSet<EngagementDocument> Documents => Set<EngagementDocument>();
    public DbSet<EngagementIntegrationReceipt> IntegrationReceipts => Set<EngagementIntegrationReceipt>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var assignment = modelBuilder.Entity<EngagementAssignment>();
        assignment.ToTable("EngagementAssignments");
        assignment.HasKey(x => x.Id);
        assignment.Property(x => x.ExternalAssignmentId).HasMaxLength(160).IsRequired();
        assignment.Property(x => x.Title).HasMaxLength(220).IsRequired();
        assignment.Property(x => x.SpeakerName).HasMaxLength(180).IsRequired();
        assignment.Property(x => x.HostOrganization).HasMaxLength(220).IsRequired();
        assignment.Property(x => x.HostContactName).HasMaxLength(180);
        assignment.Property(x => x.HostContactEmail).HasMaxLength(320);
        assignment.Property(x => x.Location).HasMaxLength(300);
        assignment.Property(x => x.Status).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.TravelStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.LodgingStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.TransportationStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.HostStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.DocumentsStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.CloseoutStatus).HasMaxLength(40).IsRequired();
        assignment.Property(x => x.Notes).HasMaxLength(12000);
        assignment.HasIndex(x => new { x.TenantId, x.ExternalAssignmentId }).IsUnique();
        assignment.HasMany(x => x.Tasks).WithOne(x => x.Assignment)
            .HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.Cascade);
        assignment.HasMany(x => x.Documents).WithOne(x => x.Assignment)
            .HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.Cascade);

        var task = modelBuilder.Entity<EngagementTask>();
        task.ToTable("EngagementTasks");
        task.HasKey(x => x.Id);
        task.Property(x => x.Category).HasMaxLength(40).IsRequired();
        task.Property(x => x.Title).HasMaxLength(240).IsRequired();
        task.Property(x => x.Owner).HasMaxLength(180).IsRequired();
        task.Property(x => x.Status).HasMaxLength(40).IsRequired();
        task.Property(x => x.Detail).HasMaxLength(3000);
        task.HasIndex(x => new { x.AssignmentId, x.Category, x.Title }).IsUnique();

        var document = modelBuilder.Entity<EngagementDocument>();
        document.ToTable("EngagementDocuments");
        document.HasKey(x => x.Id);
        document.Property(x => x.Name).HasMaxLength(220).IsRequired();
        document.Property(x => x.Category).HasMaxLength(60).IsRequired();
        document.Property(x => x.Status).HasMaxLength(40).IsRequired();
        document.Property(x => x.StorageReference).HasMaxLength(1000);

        var receipt = modelBuilder.Entity<EngagementIntegrationReceipt>();
        receipt.ToTable("EngagementIntegrationReceipts");
        receipt.HasKey(x => x.EventId);
        receipt.Property(x => x.EventName).HasMaxLength(120).IsRequired();
        receipt.Property(x => x.SourceModule).HasMaxLength(80).IsRequired();
    }
}

public sealed class EngagementAssignment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string ExternalAssignmentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string SpeakerName { get; set; } = string.Empty;
    public string HostOrganization { get; set; } = string.Empty;
    public string? HostContactName { get; set; }
    public string? HostContactEmail { get; set; }
    public string? Location { get; set; }
    public DateTimeOffset? StartsAtUtc { get; set; }
    public DateTimeOffset? EndsAtUtc { get; set; }
    public string Status { get; set; } = "planning";
    public string TravelStatus { get; set; } = "not-started";
    public string LodgingStatus { get; set; } = "not-started";
    public string TransportationStatus { get; set; } = "not-started";
    public string HostStatus { get; set; } = "not-started";
    public string DocumentsStatus { get; set; } = "not-started";
    public string CloseoutStatus { get; set; } = "not-started";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public ICollection<EngagementTask> Tasks { get; set; } = [];
    public ICollection<EngagementDocument> Documents { get; set; } = [];
}

public sealed class EngagementTask
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Status { get; set; } = "open";
    public string? Detail { get; set; }
    public DateTimeOffset? DueAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed class EngagementDocument
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = "requested";
    public string? StorageReference { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public EngagementAssignment? Assignment { get; set; }
}

public sealed class EngagementIntegrationReceipt
{
    public Guid EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public string SourceModule { get; set; } = string.Empty;
    public DateTimeOffset ReceivedAtUtc { get; set; }
}

public sealed record CreateEngagementRequest(
    string ExternalAssignmentId,
    string Title,
    string SpeakerName,
    string HostOrganization,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    string? Location);

public sealed record UpdateEngagementRequest(
    string Title,
    string SpeakerName,
    string HostOrganization,
    string? HostContactName,
    string? HostContactEmail,
    string? Location,
    DateTimeOffset? StartsAtUtc,
    DateTimeOffset? EndsAtUtc,
    string Status,
    string TravelStatus,
    string LodgingStatus,
    string TransportationStatus,
    string HostStatus,
    string DocumentsStatus,
    string CloseoutStatus,
    string? Notes);

public sealed record CreateEngagementTaskRequest(
    string Category,
    string Title,
    string Owner,
    string? Detail,
    DateTimeOffset? DueAtUtc);
public sealed record UpdateEngagementTaskRequest(string Status, string? Owner, string? Detail, DateTimeOffset? DueAtUtc);
public sealed record CreateEngagementDocumentRequest(string Name, string Category, string Status, string? StorageReference);

public sealed record IntegrationEventEnvelope(
    Guid EventId,
    string EventName,
    int Version,
    DateTimeOffset OccurredUtc,
    Guid TenantId,
    string SourceModule,
    JsonElement Payload);

public sealed record EngagementSummary(
    Guid Id,
    string ExternalAssignmentId,
    string Title,
    string SpeakerName,
    string HostOrganization,
    string? Location,
    DateTimeOffset? StartsAtUtc,
    string Status,
    int ReadinessPercent,
    int OpenTasks,
    string TravelStatus,
    string LodgingStatus,
    string TransportationStatus,
    string HostStatus,
    string DocumentsStatus,
    string CloseoutStatus,
    DateTimeOffset UpdatedAtUtc);

public sealed record EngagementDetails(
    EngagementSummary Summary,
    string? HostContactName,
    string? HostContactEmail,
    DateTimeOffset? EndsAtUtc,
    string? Notes,
    IReadOnlyList<EngagementTask> Tasks,
    IReadOnlyList<EngagementDocument> Documents);

public sealed class EngagementsInitializer(EngagementsDbContext database)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (database.Database.IsRelational())
            await database.Database.MigrateAsync(cancellationToken);
        else
            await database.Database.EnsureCreatedAsync(cancellationToken);

        if (await database.Assignments.AnyAsync(cancellationToken)) return;

        var now = DateTimeOffset.UtcNow;
        var assignment = new EngagementAssignment
        {
            Id = Guid.NewGuid(),
            TenantId = KingdomIdentity.DemoTenantId,
            ExternalAssignmentId = "assignment-demo-001",
            Title = "Kingdom Leadership Gathering",
            SpeakerName = "Cynthia Thompson",
            HostOrganization = "New Covenant Fellowship",
            HostContactName = "Jordan Ellis",
            HostContactEmail = "jordan@example.org",
            Location = "Atlanta, Georgia",
            StartsAtUtc = now.AddDays(21),
            EndsAtUtc = now.AddDays(23),
            Status = "planning",
            TravelStatus = "in-progress",
            LodgingStatus = "confirmed",
            TransportationStatus = "needs-attention",
            HostStatus = "confirmed",
            DocumentsStatus = "in-progress",
            CloseoutStatus = "not-started",
            Notes = "Keep host logistics and traveler-facing details inside Engagements.",
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), Category = "travel", Title = "Confirm flight itinerary",
            Owner = "Engagement Coordinator", Status = "in-progress", DueAtUtc = now.AddDays(7), UpdatedAtUtc = now
        });
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), Category = "transportation", Title = "Confirm airport pickup",
            Owner = "Host Coordinator", Status = "open", DueAtUtc = now.AddDays(12), UpdatedAtUtc = now
        });
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), Category = "host", Title = "Approve final event schedule",
            Owner = "Host Organization", Status = "complete", DueAtUtc = now.AddDays(5), UpdatedAtUtc = now
        });
        assignment.Documents.Add(new EngagementDocument
        {
            Id = Guid.NewGuid(), Name = "Speaker agreement", Category = "agreement",
            Status = "received", UpdatedAtUtc = now
        });
        assignment.Documents.Add(new EngagementDocument
        {
            Id = Guid.NewGuid(), Name = "Final itinerary", Category = "travel",
            Status = "requested", UpdatedAtUtc = now
        });
        database.Assignments.Add(assignment);
        await database.SaveChangesAsync(cancellationToken);
    }
}

public sealed class EngagementsService(EngagementsDbContext database)
{
    private static readonly HashSet<string> WorkflowStatuses = new(StringComparer.OrdinalIgnoreCase)
        { "not-started", "open", "in-progress", "needs-attention", "confirmed", "complete", "received", "requested", "waived" };

    public async Task<IReadOnlyList<EngagementSummary>> GetAsync(Guid tenantId, CancellationToken cancellationToken) =>
        (await database.Assignments.AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .Include(x => x.Tasks)
            .OrderBy(x => x.StartsAtUtc)
            .ToListAsync(cancellationToken))
        .Select(MapSummary)
        .ToArray();

    public async Task<EngagementDetails?> GetAsync(Guid tenantId, Guid id, CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments.AsNoTracking()
            .Include(x => x.Tasks)
            .Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        return assignment is null ? null : MapDetails(assignment);
    }

    public async Task<EngagementDetails> CreateAsync(Guid tenantId, CreateEngagementRequest request, CancellationToken cancellationToken)
    {
        var externalId = Required(request.ExternalAssignmentId, nameof(request.ExternalAssignmentId));
        if (await database.Assignments.AnyAsync(x => x.TenantId == tenantId && x.ExternalAssignmentId == externalId, cancellationToken))
            throw new InvalidOperationException("That assignment is already in Kingdom Engagements.");
        var now = DateTimeOffset.UtcNow;
        var assignment = new EngagementAssignment
        {
            Id = Guid.NewGuid(), TenantId = tenantId, ExternalAssignmentId = externalId,
            Title = Required(request.Title, nameof(request.Title)),
            SpeakerName = Required(request.SpeakerName, nameof(request.SpeakerName)),
            HostOrganization = Required(request.HostOrganization, nameof(request.HostOrganization)),
            StartsAtUtc = request.StartsAtUtc, EndsAtUtc = request.EndsAtUtc,
            Location = request.Location?.Trim(), CreatedAtUtc = now, UpdatedAtUtc = now
        };
        database.Assignments.Add(assignment);
        await database.SaveChangesAsync(cancellationToken);
        return MapDetails(assignment);
    }

    public async Task<EngagementDetails?> UpdateAsync(Guid tenantId, Guid id, UpdateEngagementRequest request, CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments
            .Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (assignment is null) return null;
        assignment.Title = Required(request.Title, nameof(request.Title));
        assignment.SpeakerName = Required(request.SpeakerName, nameof(request.SpeakerName));
        assignment.HostOrganization = Required(request.HostOrganization, nameof(request.HostOrganization));
        assignment.HostContactName = request.HostContactName?.Trim();
        assignment.HostContactEmail = request.HostContactEmail?.Trim().ToLowerInvariant();
        assignment.Location = request.Location?.Trim();
        assignment.StartsAtUtc = request.StartsAtUtc;
        assignment.EndsAtUtc = request.EndsAtUtc;
        assignment.Status = Required(request.Status, nameof(request.Status)).ToLowerInvariant();
        assignment.TravelStatus = ValidateWorkflow(request.TravelStatus, nameof(request.TravelStatus));
        assignment.LodgingStatus = ValidateWorkflow(request.LodgingStatus, nameof(request.LodgingStatus));
        assignment.TransportationStatus = ValidateWorkflow(request.TransportationStatus, nameof(request.TransportationStatus));
        assignment.HostStatus = ValidateWorkflow(request.HostStatus, nameof(request.HostStatus));
        assignment.DocumentsStatus = ValidateWorkflow(request.DocumentsStatus, nameof(request.DocumentsStatus));
        assignment.CloseoutStatus = ValidateWorkflow(request.CloseoutStatus, nameof(request.CloseoutStatus));
        assignment.Notes = request.Notes?.Trim();
        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        return MapDetails(assignment);
    }

    public async Task<EngagementDetails?> AddTaskAsync(Guid tenantId, Guid id, CreateEngagementTaskRequest request, CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments.Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (assignment is null) return null;
        assignment.Tasks.Add(new EngagementTask
        {
            Id = Guid.NewGuid(), Category = Required(request.Category, nameof(request.Category)).ToLowerInvariant(),
            Title = Required(request.Title, nameof(request.Title)), Owner = Required(request.Owner, nameof(request.Owner)),
            Detail = request.Detail?.Trim(), DueAtUtc = request.DueAtUtc, Status = "open", UpdatedAtUtc = DateTimeOffset.UtcNow
        });
        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        return MapDetails(assignment);
    }

    public async Task<EngagementDetails?> UpdateTaskAsync(Guid tenantId, Guid id, Guid taskId, UpdateEngagementTaskRequest request, CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments.Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        var task = assignment?.Tasks.SingleOrDefault(x => x.Id == taskId);
        if (assignment is null || task is null) return null;
        task.Status = ValidateWorkflow(request.Status, nameof(request.Status));
        if (!string.IsNullOrWhiteSpace(request.Owner)) task.Owner = request.Owner.Trim();
        task.Detail = request.Detail?.Trim();
        task.DueAtUtc = request.DueAtUtc;
        task.UpdatedAtUtc = DateTimeOffset.UtcNow;
        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        return MapDetails(assignment);
    }

    public async Task<EngagementDetails?> AddDocumentAsync(Guid tenantId, Guid id, CreateEngagementDocumentRequest request, CancellationToken cancellationToken)
    {
        var assignment = await database.Assignments.Include(x => x.Tasks).Include(x => x.Documents)
            .SingleOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);
        if (assignment is null) return null;
        assignment.Documents.Add(new EngagementDocument
        {
            Id = Guid.NewGuid(), Name = Required(request.Name, nameof(request.Name)),
            Category = Required(request.Category, nameof(request.Category)).ToLowerInvariant(),
            Status = ValidateWorkflow(request.Status, nameof(request.Status)),
            StorageReference = request.StorageReference?.Trim(), UpdatedAtUtc = DateTimeOffset.UtcNow
        });
        assignment.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await database.SaveChangesAsync(cancellationToken);
        return MapDetails(assignment);
    }

    public async Task<EngagementDocument?> GetDocumentAsync(Guid tenantId, Guid assignmentId, Guid documentId, CancellationToken cancellationToken) =>
        await database.Documents.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AssignmentId == assignmentId && item.Id == documentId && item.Assignment != null && item.Assignment.TenantId == tenantId, cancellationToken);

    public async Task<(bool Duplicate, Guid? AssignmentId)> IngestAsync(IntegrationEventEnvelope envelope, CancellationToken cancellationToken)
    {
        if (await database.IntegrationReceipts.AnyAsync(x => x.EventId == envelope.EventId, cancellationToken))
        {
            var existingExternal = PayloadString(envelope.Payload, "assignmentId")
                ?? PayloadString(envelope.Payload, "subjectId") ?? PayloadString(envelope.Payload, "id");
            var existingId = existingExternal is null ? null :
                await database.Assignments.Where(x => x.TenantId == envelope.TenantId && x.ExternalAssignmentId == existingExternal)
                    .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
            return (true, existingId);
        }
        if (!string.Equals(envelope.EventName, "AssignmentApproved", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Kingdom Engagements accepts AssignmentApproved events only.");

        var externalId = PayloadString(envelope.Payload, "assignmentId")
            ?? PayloadString(envelope.Payload, "subjectId")
            ?? PayloadString(envelope.Payload, "id")
            ?? envelope.EventId.ToString("N");
        var assignment = await database.Assignments.SingleOrDefaultAsync(x =>
            x.TenantId == envelope.TenantId && x.ExternalAssignmentId == externalId, cancellationToken);
        if (assignment is null)
        {
            var now = DateTimeOffset.UtcNow;
            assignment = new EngagementAssignment
            {
                Id = Guid.NewGuid(), TenantId = envelope.TenantId, ExternalAssignmentId = externalId,
                Title = PayloadString(envelope.Payload, "title") ?? "Approved engagement",
                SpeakerName = PayloadString(envelope.Payload, "speakerName") ?? "To be assigned",
                HostOrganization = PayloadString(envelope.Payload, "hostOrganization") ?? "Host pending",
                Location = PayloadString(envelope.Payload, "location"),
                StartsAtUtc = PayloadDate(envelope.Payload, "startsAtUtc"),
                EndsAtUtc = PayloadDate(envelope.Payload, "endsAtUtc"),
                Status = "approved", CreatedAtUtc = now, UpdatedAtUtc = now
            };
            assignment.Tasks.Add(new EngagementTask
            {
                Id = Guid.NewGuid(), Category = "host", Title = "Confirm host contact and event details",
                Owner = "Engagement Coordinator", Status = "open", UpdatedAtUtc = now
            });
            assignment.Tasks.Add(new EngagementTask
            {
                Id = Guid.NewGuid(), Category = "travel", Title = "Begin travel readiness",
                Owner = "Engagement Coordinator", Status = "open", UpdatedAtUtc = now
            });
            database.Assignments.Add(assignment);
        }
        database.IntegrationReceipts.Add(new EngagementIntegrationReceipt
        {
            EventId = envelope.EventId, EventName = envelope.EventName,
            SourceModule = envelope.SourceModule, ReceivedAtUtc = DateTimeOffset.UtcNow
        });
        await database.SaveChangesAsync(cancellationToken);
        return (false, assignment.Id);
    }

    private static EngagementSummary MapSummary(EngagementAssignment assignment)
    {
        var tasks = assignment.Tasks.ToArray();
        var complete = tasks.Count(x => x.Status is "complete" or "confirmed" or "received" or "waived");
        var readiness = tasks.Length == 0 ? 0 : (int)Math.Round(complete * 100d / tasks.Length);
        return new EngagementSummary(
            assignment.Id, assignment.ExternalAssignmentId, assignment.Title, assignment.SpeakerName,
            assignment.HostOrganization, assignment.Location, assignment.StartsAtUtc, assignment.Status,
            readiness, tasks.Count(x => x.Status is not ("complete" or "confirmed" or "received" or "waived")),
            assignment.TravelStatus, assignment.LodgingStatus, assignment.TransportationStatus,
            assignment.HostStatus, assignment.DocumentsStatus, assignment.CloseoutStatus, assignment.UpdatedAtUtc);
    }

    private static EngagementDetails MapDetails(EngagementAssignment assignment) => new(
        MapSummary(assignment), assignment.HostContactName, assignment.HostContactEmail,
        assignment.EndsAtUtc, assignment.Notes,
        assignment.Tasks.OrderBy(x => x.DueAtUtc).ThenBy(x => x.Category).ToArray(),
        assignment.Documents.OrderBy(x => x.Category).ThenBy(x => x.Name).ToArray());

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException($"{field} is required.") : value.Trim();

    private static string ValidateWorkflow(string value, string field)
    {
        var normalized = Required(value, field).ToLowerInvariant();
        return WorkflowStatuses.Contains(normalized)
            ? normalized
            : throw new ArgumentException($"{field} has an unsupported workflow status.");
    }

    private static string? PayloadString(JsonElement payload, string name) =>
        payload.ValueKind == JsonValueKind.Object && payload.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()?.Trim()
            : null;

    private static DateTimeOffset? PayloadDate(JsonElement payload, string name) =>
        DateTimeOffset.TryParse(PayloadString(payload, name), out var value) ? value : null;
}

public static class EngagementsEndpoints
{
    private static readonly string[] Coordinators = ["Administrator", "Coordinator"];

    public static IEndpointRouteBuilder MapEngagementsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements").RequireAuthorization();
        group.MapGet("/assignments", async (HttpContext context, EngagementsService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), ct)));
        group.MapGet("/assignments/{id:guid}", async (Guid id, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            var item = await service.GetAsync(KingdomIdentity.TenantId(context.User, context.Request), id, ct);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });
        group.MapPost("/assignments", async (CreateEngagementRequest request, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CreateAsync(KingdomIdentity.TenantId(context.User, context.Request), request, ct)); }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["assignment"] = [exception.Message] }); }
            catch (InvalidOperationException exception) { return Results.Conflict(new { message = exception.Message }); }
        }).RequireAuthorization("EngagementsWrite");
        group.MapPut("/assignments/{id:guid}", async (Guid id, UpdateEngagementRequest request, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.UpdateAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request, ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["assignment"] = [exception.Message] }); }
        }).RequireAuthorization("EngagementsWrite");
        group.MapPost("/assignments/{id:guid}/tasks", async (Guid id, CreateEngagementTaskRequest request, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.AddTaskAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request, ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["task"] = [exception.Message] }); }
        }).RequireAuthorization("EngagementsWrite");
        group.MapPut("/assignments/{id:guid}/tasks/{taskId:guid}", async (Guid id, Guid taskId, UpdateEngagementTaskRequest request, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.UpdateTaskAsync(KingdomIdentity.TenantId(context.User, context.Request), id, taskId, request, ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["task"] = [exception.Message] }); }
        }).RequireAuthorization("EngagementsWrite");
        group.MapPost("/assignments/{id:guid}/documents", async (Guid id, CreateEngagementDocumentRequest request, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            try
            {
                var item = await service.AddDocumentAsync(KingdomIdentity.TenantId(context.User, context.Request), id, request, ct);
                return item is null ? Results.NotFound() : Results.Ok(item);
            }
            catch (ArgumentException exception) { return Results.ValidationProblem(new Dictionary<string, string[]> { ["document"] = [exception.Message] }); }
        }).RequireAuthorization("EngagementsWrite");
        group.MapGet("/assignments/{id:guid}/documents/{documentId:guid}", async (Guid id, Guid documentId, HttpContext context, EngagementsService service, CancellationToken ct) =>
        {
            var item = await service.GetDocumentAsync(KingdomIdentity.TenantId(context.User, context.Request), id, documentId, ct);
            if (item is null) return Results.NotFound();
            var title = WebUtility.HtmlEncode(item.Name);
            var category = WebUtility.HtmlEncode(item.Category.Replace('-', ' '));
            var status = WebUtility.HtmlEncode(item.Status.Replace('-', ' '));
            var updated = WebUtility.HtmlEncode(item.UpdatedAtUtc.ToString("MMMM d, yyyy 'at' h:mm tt 'UTC'"));
            var html = $$"""
                <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{title}}</title>
                <style>body{margin:0;background:#f4f2ed;color:#151c2f;font:16px/1.6 system-ui,sans-serif}main{width:min(760px,calc(100% - 36px));margin:48px auto;padding:42px;background:white;border:1px solid #dfe2e7;border-radius:14px;box-shadow:0 18px 50px #10182a12}small{color:#315faf;font-weight:800;text-transform:uppercase;letter-spacing:.1em}h1{margin:.4rem 0 1rem;font-size:2.3rem}dl{display:grid;grid-template-columns:160px 1fr;border-top:1px solid #e4e6ea}div{display:contents}dt,dd{margin:0;padding:14px 0;border-bottom:1px solid #e4e6ea}dt{color:#6c7586}dd{font-weight:700}</style></head>
                <body><main><small>ApostolOS Engagements record</small><h1>{{title}}</h1><p>This is the durable assignment record for this document. Uploaded source files open directly from Host coordination files.</p><dl><div><dt>Category</dt><dd>{{category}}</dd></div><div><dt>Status</dt><dd>{{status}}</dd></div><div><dt>Last updated</dt><dd>{{updated}}</dd></div></dl></main></body></html>
                """;
            return Results.Content(html, "text/html; charset=utf-8");
        });

        endpoints.MapPost("/api/integration/events", async (
            IntegrationEventEnvelope envelope,
            HttpContext context,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            EngagementsService service,
            CancellationToken ct) =>
        {
            var configuredKey = configuration["KingdomOS:Integration:ServiceKey"];
            var suppliedKey = context.Request.Headers["X-Kingdom-Service-Key"].FirstOrDefault();
            if (!environment.IsDevelopment() &&
                (string.IsNullOrWhiteSpace(configuredKey) || !string.Equals(configuredKey, suppliedKey, StringComparison.Ordinal)))
                return Results.Unauthorized();
            try
            {
                var result = await service.IngestAsync(envelope, ct);
                return Results.Ok(new { accepted = true, duplicate = result.Duplicate, assignmentId = result.AssignmentId });
            }
            catch (ArgumentException exception)
            {
                return Results.BadRequest(new { message = exception.Message });
            }
        }).AllowAnonymous();
        return endpoints;
    }
}
