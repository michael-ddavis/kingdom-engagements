# Production secrets and observability

Kingdom Engagements treats configuration safety and monitoring as production runtime requirements.

## Secret delivery

Sensitive values should be delivered by the cloud runtime rather than committed to the repository.

Supported patterns:

- environment variables supplied by the deployment platform;
- mounted secret files, defaulting to `/run/secrets`;
- workload identity / IAM roles for provider-native credentials such as S3 access.

Mounted secret files use `__` as the configuration separator. For example:

```text
ConnectionStrings__EngagementsDatabase
ConnectionStrings__Redis
```

The file contents become the values for `ConnectionStrings:EngagementsDatabase` and `ConnectionStrings:Redis`.

In Production, the application fails startup unless the runtime is configured for SQL Server, required Redis, S3 document storage, HTTPS host coordination, non-wildcard allowed hosts, disabled demo/legacy access, and an OTLP telemetry exporter.

## Cloud secret-manager mapping

The application does not depend on a specific secret-manager SDK.

A deployment can inject secrets from:

- Azure Key Vault through the hosting platform or mounted secrets;
- AWS Secrets Manager / Parameter Store through task or workload integration;
- Google Secret Manager through the hosting platform;
- Kubernetes Secrets or Docker secrets as mounted files.

Provider SDK credentials should prefer workload identity over static access keys.

## Health endpoints

`GET /health/live` answers only whether the process is alive.

`GET /health/ready` and the compatibility endpoint `GET /health` verify:

- application initialization;
- SQL Server connectivity;
- Redis connectivity when configured;
- object-storage access;
- ApostolOS platform entitlement.

A failed dependency returns HTTP 503. Public readiness responses return dependency status without exposing raw provider exception messages.

## Correlation and structured logs

Every request receives an `X-Correlation-ID` response header. A caller-provided value is reused only when it is short and contains safe characters; otherwise the application generates one.

Production console logs are JSON and include the correlation scope plus trace/span information. Request completion logs use route templates rather than raw token-bearing URLs.

## OpenTelemetry

The application exports standard ASP.NET Core and HttpClient traces/metrics plus ApostolOS request and dependency metrics.

Custom meters include:

```text
apostolos.engagements.http.requests
apostolos.engagements.http.failures
apostolos.engagements.http.duration
apostolos.engagements.dependency.failures
apostolos.engagements.dependency.duration
```

Configure the OTLP destination with:

```text
KingdomOS__Observability__OtlpEndpoint=<collector endpoint>
```

or:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=<collector endpoint>
```

The OTLP collector can then forward telemetry to the eventual production monitoring provider without changing Engagements domain code.
