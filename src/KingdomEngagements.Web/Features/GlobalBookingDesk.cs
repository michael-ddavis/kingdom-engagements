using System.Text.Json;
using KingdomEngagements.Web.Platform;
using Microsoft.EntityFrameworkCore;

namespace KingdomEngagements.Web.Features;

public sealed class GlobalBookingDbContext(DbContextOptions<GlobalBookingDbContext> options) : DbContext(options)
{
    public DbSet<GlobalBookingRecord> Bookings => Set<GlobalBookingRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var booking = modelBuilder.Entity<GlobalBookingRecord>();
        booking.ToTable("EngagementGlobalBookings");
        booking.HasKey(x => x.Id);
        booking.HasIndex(x => new { x.TenantId, x.UpdatedAtUtc });
        booking.HasIndex(x => new { x.TenantId, x.Stage });
        booking.Property(x => x.Stage).HasMaxLength(40).IsRequired();
        booking.Property(x => x.Country).HasMaxLength(120).IsRequired();
        booking.Property(x => x.PayloadJson).HasColumnType("nvarchar(max)").IsRequired();
    }

    public async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            await Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        const string sql = """
IF OBJECT_ID(N'[dbo].[EngagementGlobalBookings]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EngagementGlobalBookings] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Stage] nvarchar(40) NOT NULL,
        [Country] nvarchar(120) NOT NULL,
        [RequestedStartDate] date NULL,
        [HoldExpiresAtUtc] datetimeoffset NULL,
        [LastResponseAtUtc] datetimeoffset NULL,
        [PayloadJson] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetimeoffset NOT NULL,
        [UpdatedAtUtc] datetimeoffset NOT NULL,
        CONSTRAINT [PK_EngagementGlobalBookings] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_EngagementGlobalBookings_TenantId_UpdatedAtUtc]
        ON [dbo].[EngagementGlobalBookings] ([TenantId], [UpdatedAtUtc]);
    CREATE INDEX [IX_EngagementGlobalBookings_TenantId_Stage]
        ON [dbo].[EngagementGlobalBookings] ([TenantId], [Stage]);
END;
""";

        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}

public sealed class GlobalBookingRecord
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Stage { get; set; } = "new";
    public string Country { get; set; } = string.Empty;
    public DateOnly? RequestedStartDate { get; set; }
    public DateTimeOffset? HoldExpiresAtUtc { get; set; }
    public DateTimeOffset? LastResponseAtUtc { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public static class GlobalBookingDeskEndpoints
{
    private static readonly HashSet<string> AllowedStages = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "needs-information", "under-review", "date-hold", "approved", "declined", "converted"
    };

    public static IEndpointRouteBuilder MapGlobalBookingDeskEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/engagements/global-bookings").RequireAuthorization();

        group.MapGet("", async (
            HttpContext context,
            GlobalBookingDbContext database,
            CancellationToken cancellationToken) =>
        {
            await database.EnsureSchemaAsync(cancellationToken);
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var payloads = await database.Bookings.AsNoTracking()
                .Where(item => item.TenantId == tenantId)
                .OrderByDescending(item => item.UpdatedAtUtc)
                .Select(item => item.PayloadJson)
                .ToListAsync(cancellationToken);

            return Results.Ok(payloads.Select(ParsePayload).ToArray());
        });

        group.MapPost("", async (
            JsonElement payload,
            HttpContext context,
            GlobalBookingDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!TryReadId(payload, out var id))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["id"] = ["A valid booking id is required."] });

            await database.EnsureSchemaAsync(cancellationToken);
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            if (await database.Bookings.AnyAsync(item => item.TenantId == tenantId && item.Id == id, cancellationToken))
                return Results.Conflict(new { message = "That booking already exists." });

            var now = DateTimeOffset.UtcNow;
            database.Bookings.Add(MapRecord(id, tenantId, payload, now, now));
            await database.SaveChangesAsync(cancellationToken);
            return Results.Ok(payload);
        }).RequireAuthorization("EngagementsWrite");

        group.MapPut("/{id:guid}", async (
            Guid id,
            JsonElement payload,
            HttpContext context,
            GlobalBookingDbContext database,
            CancellationToken cancellationToken) =>
        {
            if (!TryReadId(payload, out var payloadId) || payloadId != id)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["id"] = ["The booking id does not match the route."] });

            await database.EnsureSchemaAsync(cancellationToken);
            var tenantId = KingdomIdentity.TenantId(context.User, context.Request);
            var existing = await database.Bookings.SingleOrDefaultAsync(
                item => item.TenantId == tenantId && item.Id == id,
                cancellationToken);
            if (existing is null) return Results.NotFound();

            var stage = PropertyString(payload, "stage") ?? "new";
            if (!AllowedStages.Contains(stage))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["stage"] = ["The booking stage is not supported."] });

            existing.Stage = stage;
            existing.Country = PropertyString(payload, "country") ?? string.Empty;
            existing.RequestedStartDate = PropertyDate(payload, "requestedStartDate");
            existing.HoldExpiresAtUtc = PropertyDateTime(payload, "holdExpiresAtUtc");
            existing.LastResponseAtUtc = PropertyDateTime(payload, "lastResponseAtUtc");
            existing.PayloadJson = payload.GetRawText();
            existing.UpdatedAtUtc = DateTimeOffset.UtcNow;
            await database.SaveChangesAsync(cancellationToken);
            return Results.Ok(payload);
        }).RequireAuthorization("EngagementsWrite");

        return endpoints;
    }

    private static GlobalBookingRecord MapRecord(
        Guid id,
        Guid tenantId,
        JsonElement payload,
        DateTimeOffset createdAtUtc,
        DateTimeOffset updatedAtUtc)
    {
        var stage = PropertyString(payload, "stage") ?? "new";
        if (!AllowedStages.Contains(stage)) stage = "new";

        return new GlobalBookingRecord
        {
            Id = id,
            TenantId = tenantId,
            Stage = stage,
            Country = PropertyString(payload, "country") ?? string.Empty,
            RequestedStartDate = PropertyDate(payload, "requestedStartDate"),
            HoldExpiresAtUtc = PropertyDateTime(payload, "holdExpiresAtUtc"),
            LastResponseAtUtc = PropertyDateTime(payload, "lastResponseAtUtc"),
            PayloadJson = payload.GetRawText(),
            CreatedAtUtc = PropertyDateTime(payload, "createdAtUtc") ?? createdAtUtc,
            UpdatedAtUtc = updatedAtUtc,
        };
    }

    private static bool TryReadId(JsonElement payload, out Guid id) =>
        payload.ValueKind == JsonValueKind.Object &&
        payload.TryGetProperty("id", out var value) &&
        value.ValueKind == JsonValueKind.String &&
        Guid.TryParse(value.GetString(), out id);

    private static string? PropertyString(JsonElement payload, string name) =>
        payload.ValueKind == JsonValueKind.Object &&
        payload.TryGetProperty(name, out var value) &&
        value.ValueKind == JsonValueKind.String
            ? value.GetString()?.Trim()
            : null;

    private static DateOnly? PropertyDate(JsonElement payload, string name) =>
        DateOnly.TryParse(PropertyString(payload, name), out var value) ? value : null;

    private static DateTimeOffset? PropertyDateTime(JsonElement payload, string name) =>
        DateTimeOffset.TryParse(PropertyString(payload, name), out var value) ? value : null;

    private static JsonElement ParsePayload(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
