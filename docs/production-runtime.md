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


## Tenant isolation guarantee

Kingdom Engagements treats the active tenant as a data-access boundary, not a controller convention.

Every tenant-scoped EF Core model in all seven Engagements DbContexts has a global query filter:

- `EngagementsDbContext`
- `SpeakingRequestsDbContext`
- `GlobalBookingDbContext`
- `EngagementPreparationDbContext`
- `HostAccessDbContext`
- `AssignmentWorkspaceDbContext`
- `EngagementCompletionDbContext`

Entities with their own `TenantId` filter directly on that column. Child entities such as engagement tasks, assignment documents, speaking-request communications, and host coordination messages/documents filter through their required parent navigation. This means a query that forgets to type `.Where(x => x.TenantId == tenantId)` still cannot see another tenant.

`CurrentTenantAccessor` is scoped to the request. It resolves the main ApostolOS `kingdom:tenant` claim and the separate host-access `apostolos.tenant_id` claim. Conflicting claims are rejected. Missing tenant identity no longer falls back to a demo/default tenant.

Tenant-scoped writes are also validated before `SaveChanges`: an added or modified entity with a `TenantId` different from the active tenant is rejected.

### Explicit tenant scopes and bypasses

Code running outside an authenticated HTTP request must establish a tenant deliberately:

```csharp
using var tenantScope = tenantContext.BeginTenantScope(
    tenantId,
    "Reason this background or integration operation owns this tenant.");
```

Cross-tenant query-filter bypass is not a general repository feature. The only approved use is narrow token-to-tenant discovery for public one-time/request links whose tenant is not known until the opaque token is resolved. Bypass calls require a non-empty reason and emit a warning log:

```csharp
using (tenantContext.BeginCrossTenantBypass(
    "Resolve a host invitation token to its owning tenant."))
{
    // token lookup only
}
```

Immediately after discovery, code must enter the discovered tenant scope before further reads or writes.

Existing explicit `TenantId == tenantId` predicates remain on service/mutation boundaries as defense in depth and to make ownership requirements obvious during code review. They are no longer the primary isolation mechanism.

SignalR uses the same rule: host and internal group joins establish the tenant scope before querying assignment/access records. A client-supplied engagement ID cannot change the tenant group it is authorized to join.

### Verifying isolation

CI verifies isolation in two providers:

1. EF InMemory regression tests seed two tenants, then query direct and navigation-scoped DbSets without tenant predicates.
2. The connected SQL Server smoke test creates records in two organizations and calls a demo-only probe whose EF queries intentionally contain no tenant `Where` clause. Each tenant must see only its own assignments and child tasks.

The initial regression test was intentionally committed before the filters and failed because `GetQueryFilter()` returned null. Keep the isolation tests as a release gate.

The query filters add no columns and require no DDL change. The migration schema and the manual `EnsureSchemaAsync` DDL paths therefore remain structurally unchanged by this hardening. Navigation-based filters use relationships already represented by the existing foreign keys.

## Demo-code production boundary

Demo data workers, demo persona middleware/endpoints, and demo tenant identity constants are compiled only when `IncludeDemoFeatures=true`.

The production Docker build defaults to:

```text
IncludeDemoFeatures=false
```

CI builds a separate demo-enabled image for local/demo smoke tests, then builds the default production image and inspects the actual `KingdomEngagements.Web.dll`. The build fails if demo worker, demo middleware, demo-role, or demo-tenant symbols are present in the production binary.

The runtime checks in `ApostolOSProductionConfiguration` remain in place as a second layer. Compile-time exclusion is the primary guarantee; runtime configuration is not relied on to keep demo code from executing in production.
