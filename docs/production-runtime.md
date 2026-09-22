# Production runtime: Kingdom Engagements

Kingdom Engagements can run locally without distributed infrastructure, but production should enable the relational database, Redis, and object-storage safeguards below.

## Production environment settings

```text
Database__Provider=SqlServer
Database__RequireRelational=true
ConnectionStrings__EngagementsDatabase=<managed SQL Server connection string>

ConnectionStrings__Redis=<managed Redis connection string>
KingdomOS__DistributedRuntime__RequireRedis=true
KingdomOS__DistributedRuntime__ApplicationName=ApostolOS
KingdomOS__DistributedRuntime__SignalRChannelPrefix=ApostolOS:Engagements
KingdomOS__DistributedRuntime__DataProtectionKey=ApostolOS:DataProtectionKeys

KingdomOS__DocumentStorage__Provider=S3
KingdomOS__DocumentStorage__S3__BucketName=<private bucket name>
KingdomOS__DocumentStorage__S3__Region=<AWS region>
KingdomOS__DocumentStorage__S3__Prefix=apostolos
```

Secrets and connection strings should come from the cloud secret manager or workload environment, not source-controlled appsettings files.

## What Redis does

The same Redis deployment supports two production concerns:

1. SignalR scale-out so clients connected to different API instances receive the same realtime engagement events.
2. ASP.NET Core Data Protection key persistence so authentication cookies remain valid when a load balancer sends a request to another API instance.

Local development does not require Redis. If `ConnectionStrings:Redis` is absent, SignalR remains in-process and Data Protection can use the configured local key path.

## Production database

Set `Database:Provider` to `SqlServer` and `Database:RequireRelational` to `true`.

SQL Server connections use configurable transient retry and command-timeout settings:

```text
Database__SqlServer__MaxRetryCount=5
Database__SqlServer__MaxRetryDelaySeconds=10
Database__SqlServer__CommandTimeoutSeconds=30
```

The application will refuse to start with an in-memory provider when `RequireRelational` is enabled.

## Engagement document storage

Development can continue using:

```text
KingdomOS__DocumentStorage__Provider=Database
```

Production should use:

```text
KingdomOS__DocumentStorage__Provider=S3
```

When S3 is enabled:

- SQL stores document metadata, storage provider, and object key.
- New file bytes are stored in the private S3 bucket instead of `varbinary(max)`.
- Existing database-backed documents remain readable for backward compatibility.
- Object keys use tenant, engagement, and document IDs instead of original filenames.
- Staff and host downloads continue to pass through the existing application authorization boundary.

The application uses the normal AWS SDK credential chain, so production containers should use an IAM task/workload role rather than static access keys.

The workload role needs only the bucket/prefix permissions required by Kingdom Engagements:

```text
s3:GetObject
s3:PutObject
s3:DeleteObject
s3:ListBucket
```

Keep the bucket private. Public object URLs are not required.

## Deployment shape

```text
                 Load Balancer
                 /           \
                /             \
         Engagements API   Engagements API
               |                |
               +------ Redis ---+
               |                |
               +--- SQL Server -+
               |
               +--- private S3 bucket
```

This keeps Kingdom Engagements a modular application while allowing the API tier to scale horizontally.


## Production secrets

Production can receive sensitive configuration from environment variables or mounted secret files.

Mounted secret filenames use double underscores for configuration separators:

```text
/run/secrets/ConnectionStrings__EngagementsDatabase
/run/secrets/ConnectionStrings__Redis
```

The application maps those files to:

```text
ConnectionStrings:EngagementsDatabase
ConnectionStrings:Redis
```

Do not commit connection strings, passwords, access keys, API keys, or provider credentials to `appsettings*.json`.

## Observability

Production emits structured JSON logs and OpenTelemetry traces/metrics. Configure an OTLP collector with either:

```text
KingdomOS__Observability__OtlpEndpoint=https://collector.example.com:4317
```

or the standard OpenTelemetry setting:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com:4317
```

Use `/health/live` for process liveness and `/health/ready` for load-balancer readiness. Readiness checks SQL Server, Redis, object storage, and the platform entitlement.
