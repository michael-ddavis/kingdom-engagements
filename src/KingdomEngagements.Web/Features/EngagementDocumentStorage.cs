using Amazon;
using Amazon.S3;
using Amazon.S3.Model;

namespace KingdomEngagements.Web.Features;

public sealed record EngagementDocumentStorageRequest(
    Guid TenantId,
    Guid AssignmentId,
    Guid DocumentId,
    string ContentType,
    byte[] Content);

public sealed record EngagementDocumentStorageResult(
    string Provider,
    string? StorageKey,
    byte[] InlineContent);

public interface IEngagementDocumentStorage
{
    Task<EngagementDocumentStorageResult> StoreAsync(
        EngagementDocumentStorageRequest request,
        CancellationToken cancellationToken);

    Task<byte[]> ReadAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken);
}

public sealed class DatabaseEngagementDocumentStorage : IEngagementDocumentStorage
{
    public static DatabaseEngagementDocumentStorage Instance { get; } = new();

    private DatabaseEngagementDocumentStorage()
    {
    }

    public Task<EngagementDocumentStorageResult> StoreAsync(
        EngagementDocumentStorageRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            new EngagementDocumentStorageResult(
                Provider: "database",
                StorageKey: null,
                InlineContent: request.Content));
    }

    public Task<byte[]> ReadAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(document.Content);
    }

    public Task DeleteAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

public sealed class S3EngagementDocumentStorage(
    IAmazonS3 s3,
    IConfiguration configuration) : IEngagementDocumentStorage
{
    private readonly string _bucketName =
        Required(configuration["KingdomOS:DocumentStorage:S3:BucketName"], "KingdomOS:DocumentStorage:S3:BucketName");

    private readonly string _prefix =
        NormalizePrefix(configuration["KingdomOS:DocumentStorage:S3:Prefix"]);

    public async Task<EngagementDocumentStorageResult> StoreAsync(
        EngagementDocumentStorageRequest request,
        CancellationToken cancellationToken)
    {
        var storageKey = BuildStorageKey(request);

        await using var stream = new MemoryStream(request.Content, writable: false);
        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = storageKey,
            InputStream = stream,
            ContentType = request.ContentType,
            AutoCloseStream = false
        };

        await s3.PutObjectAsync(putRequest, cancellationToken);

        return new EngagementDocumentStorageResult(
            Provider: "s3",
            StorageKey: storageKey,
            InlineContent: []);
    }

    public async Task<byte[]> ReadAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken)
    {
        // Rows created before object storage was enabled remain readable.
        if (!string.Equals(document.StorageProvider, "s3", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(document.StorageKey))
        {
            return document.Content;
        }

        using var response = await s3.GetObjectAsync(
            _bucketName,
            document.StorageKey,
            cancellationToken);

        await using var memory = new MemoryStream();
        await response.ResponseStream.CopyToAsync(memory, cancellationToken);
        return memory.ToArray();
    }

    public async Task DeleteAsync(
        HostCoordinationDocumentRecord document,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(document.StorageProvider, "s3", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(document.StorageKey))
        {
            return;
        }

        await s3.DeleteObjectAsync(
            _bucketName,
            document.StorageKey,
            cancellationToken);
    }

    private string BuildStorageKey(EngagementDocumentStorageRequest request)
    {
        var segments = new[]
        {
            _prefix,
            "tenants",
            request.TenantId.ToString("N"),
            "engagements",
            request.AssignmentId.ToString("N"),
            "coordination-documents",
            request.DocumentId.ToString("N")
        };

        return string.Join('/', segments.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string NormalizePrefix(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? "apostolos"
            : value.Trim().Trim('/');
    }

    private static string Required(string? value, string name)
    {
        return string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"{name} is required when S3 document storage is enabled.")
            : value.Trim();
    }
}

public static class EngagementDocumentStorageRegistration
{
    public static void AddEngagementDocumentStorage(this WebApplicationBuilder builder)
    {
        var provider =
            builder.Configuration["KingdomOS:DocumentStorage:Provider"]
            ?? "Database";

        if (provider.Equals("Database", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddSingleton<IEngagementDocumentStorage>(
                DatabaseEngagementDocumentStorage.Instance);
            return;
        }

        if (!provider.Equals("S3", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Unsupported KingdomOS document storage provider '{provider}'. Use Database or S3.");
        }

        var bucketName = builder.Configuration["KingdomOS:DocumentStorage:S3:BucketName"];
        if (string.IsNullOrWhiteSpace(bucketName))
        {
            throw new InvalidOperationException(
                "KingdomOS:DocumentStorage:S3:BucketName is required when S3 document storage is enabled.");
        }

        var regionName =
            builder.Configuration["KingdomOS:DocumentStorage:S3:Region"]
            ?? builder.Configuration["AWS:Region"];

        if (string.IsNullOrWhiteSpace(regionName))
        {
            throw new InvalidOperationException(
                "KingdomOS:DocumentStorage:S3:Region or AWS:Region is required when S3 document storage is enabled.");
        }

        builder.Services.AddSingleton<IAmazonS3>(
            _ => new AmazonS3Client(RegionEndpoint.GetBySystemName(regionName)));

        builder.Services.AddSingleton<IEngagementDocumentStorage, S3EngagementDocumentStorage>();
    }
}
