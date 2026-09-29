# Kingdom Engagements

Kingdom Engagements is the independently entitled KingdomOS module for assignment intake, host coordination, travel, lodging, transportation, documents, readiness, and closeout.

This repository is intentionally separate from the KingdomSolutionz public website and from Kingdom Operations.

## Validation

Use .NET 10 and a Node.js version supported by `ClientApp/package.json`.

```sh
cd src/KingdomEngagements.Web/ClientApp
npm ci
npm run test:ci
npm run build:production
cd ../../..
dotnet test KingdomEngagements.slnx --configuration Release
docker build --tag kingdom-engagements:ci .
bash .github/scripts/connected-smoke.sh
bash .github/scripts/completion-smoke.sh
```

The connected smoke tests require Docker, Bash, and Python 3. They create disposable
SQL Server, Redis, object storage, and Platform stub containers, then clean them up.
The MinIO fixture builds pinned official MinIO and mc source releases because the
community registry image is no longer available. Its first build takes longer;
subsequent local runs reuse Docker's build cache. CI also checks production startup
failure with incomplete configuration and verifies the packaged host realtime script.

Keep `package-lock.json` committed. Use `npm install` only when intentionally changing
frontend dependencies, then validate and commit the updated lockfile.
