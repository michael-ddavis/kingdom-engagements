#!/usr/bin/env bash
set -euo pipefail

network="engagements-completion-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
sql_name="engagements-completion-sql"
platform_name="engagements-completion-platform"
app_name="engagements-completion-app"
password='LocalKingdom0S!'

cleanup() {
  docker logs "$app_name" 2>/dev/null || true
  docker rm --force "$app_name" "$platform_name" "$sql_name" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf .ci-completion-platform
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run --detach --name "$sql_name" --network "$network" -e ACCEPT_EULA=Y -e MSSQL_PID=Developer -e MSSQL_SA_PASSWORD="$password" mcr.microsoft.com/mssql/server:2022-latest >/dev/null
for attempt in {1..60}; do
  docker exec "$sql_name" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$password" -C -Q 'SELECT 1' >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$sql_name" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$password" -C -Q "IF DB_ID(N'KingdomEngagements') IS NULL CREATE DATABASE [KingdomEngagements]" >/dev/null

mkdir -p .ci-completion-platform/api
printf '%s\n' '[{"moduleKey":"engagements","enabled":true}]' > .ci-completion-platform/api/modules
docker run --detach --name "$platform_name" --network "$network" -v "$PWD/.ci-completion-platform:/srv:ro" -w /srv python:3.12-alpine python -m http.server 8080 >/dev/null

docker run --detach --name "$app_name" --network "$network" \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e Database__Provider=SqlServer \
  -e "ConnectionStrings__EngagementsDatabase=Server=$sql_name;Database=KingdomEngagements;User ID=sa;Password=$password;TrustServerCertificate=True" \
  -e "KingdomOS__PlatformInternalUrl=http://$platform_name:8080" \
  -e KingdomOS__Entitlements__BypassInDevelopment=false \
  -e KingdomOS__Entitlements__FailOpenInDevelopment=false \
  kingdom-engagements:ci >/dev/null

for attempt in {1..60}; do
  docker exec "$app_name" curl --fail --silent http://localhost:8080/health | grep --quiet '"platformEntitlement":"enabled"' && break
  sleep 2
done

assignment_json="$(docker exec "$app_name" curl --fail --silent -X POST http://localhost:8080/api/engagements/assignments -H 'Content-Type: application/json' -d '{"externalAssignmentId":"completion-ci-001","title":"Completion CI Event","speakerName":"Cynthia Thompson","hostOrganization":"Completion Fellowship","startsAtUtc":"2026-09-01T14:00:00Z","endsAtUtc":"2026-09-01T18:00:00Z","location":"Richmond, Virginia"}')"
assignment_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["summary"]["id"])' <<<"$assignment_json")"

response_json="$(docker exec "$app_name" curl --fail --silent -X POST "http://localhost:8080/api/engagements/assignments/$assignment_id/responses" -H 'Content-Type: application/json' -d '{"type":"discipleship","count":1,"personName":"Demo Learner","email":"learner@example.org","phone":"+1 804 555 0101","notes":"Requested local discipleship follow-up.","requiresFollowUp":true,"followUpOwner":"Engagement Coordinator","followUpDueAtUtc":"2026-09-03T17:00:00Z"}')"
response_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["responses"][0]["id"])' <<<"$response_json")"
grep --quiet '"followUpsOpen":1' <<<"$response_json"

docker exec "$app_name" curl --fail --silent -X PUT "http://localhost:8080/api/engagements/assignments/$assignment_id/responses/$response_id/follow-up" -H 'Content-Type: application/json' -d '{"status":"completed","owner":"Engagement Coordinator","dueAtUtc":"2026-09-03T17:00:00Z","notes":"Connected with local ministry leader."}' | grep --quiet '"followUpsOpen":0'

closeout_json="$(docker exec "$app_name" curl --fail --silent -X PUT "http://localhost:8080/api/engagements/assignments/$assignment_id/closeout" -H 'Content-Type: application/json' -d '{"eventNotes":"Leadership gathering completed as scheduled.","testimonySummary":"One person requested intentional discipleship follow-up.","hostFollowUpComplete":true,"hostFollowUpNotes":"Thank-you and debrief completed.","finalDocumentsComplete":true,"paymentComplete":true,"administrativeFollowUpComplete":true,"outcomesRecorded":true,"complete":true}')"
grep --quiet '"canComplete":true' <<<"$closeout_json"
grep --quiet '"completedAtUtc"' <<<"$closeout_json"

docker exec "$app_name" curl --fail --silent "http://localhost:8080/api/engagements/assignments/$assignment_id" | grep --quiet '"closeoutStatus":"complete"'
docker exec "$app_name" curl --fail --silent "http://localhost:8080/api/engagements/assignments/$assignment_id" | grep --quiet '"status":"complete"'
