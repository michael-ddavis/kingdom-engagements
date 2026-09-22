#!/usr/bin/env bash
set -euo pipefail

network="engagements-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
sql_name="engagements-sql"
redis_name="engagements-redis"
minio_name="engagements-minio"
platform_name="engagements-platform"
app_name="engagements-app"
second_app_name="engagements-app-2"
production_app_name="engagements-app-production"
password='LocalKingdom0S!'

cleanup() {
  docker logs "$app_name" 2>/dev/null || true
  docker logs "$second_app_name" 2>/dev/null || true
  docker logs "$production_app_name" 2>/dev/null || true
  docker rm --force "$production_app_name" "$second_app_name" "$app_name" "$platform_name" "$minio_name" "$redis_name" "$sql_name" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf .ci-platform .ci-secrets
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run --detach --name "$sql_name" --network "$network" \
  -e ACCEPT_EULA=Y \
  -e MSSQL_PID=Developer \
  -e MSSQL_SA_PASSWORD="$password" \
  mcr.microsoft.com/mssql/server:2022-latest >/dev/null

sql_ready=false
for attempt in {1..60}; do
  if docker exec "$sql_name" /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$password" -C -Q 'SELECT 1' >/dev/null 2>&1; then
    sql_ready=true
    break
  fi
  sleep 2
done
if [ "$sql_ready" != true ]; then
  echo 'SQL Server did not become ready.' >&2
  docker logs "$sql_name" >&2 || true
  exit 1
fi

docker exec "$sql_name" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$password" -C \
  -Q "IF DB_ID(N'KingdomEngagements') IS NULL CREATE DATABASE [KingdomEngagements]" >/dev/null

docker run --detach --name "$redis_name" --network "$network" \
  redis:7-alpine >/dev/null

redis_ready=false
for attempt in {1..30}; do
  if docker exec "$redis_name" redis-cli ping 2>/dev/null | grep --quiet PONG; then
    redis_ready=true
    break
  fi
  sleep 1
done
if [ "$redis_ready" != true ]; then
  echo 'Redis did not become ready.' >&2
  docker logs "$redis_name" >&2 || true
  exit 1
fi

docker run --detach --name "$minio_name" --network "$network" \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio:latest server /data >/dev/null

minio_ready=false
for attempt in {1..30}; do
  if docker exec "$minio_name" mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1 \
    && docker exec "$minio_name" mc ready local >/dev/null 2>&1; then
    minio_ready=true
    break
  fi
  sleep 1
done
if [ "$minio_ready" != true ]; then
  echo 'MinIO did not become ready.' >&2
  docker logs "$minio_name" >&2 || true
  exit 1
fi

docker exec "$minio_name" mc mb --ignore-existing local/engagements-ci >/dev/null

mkdir -p .ci-platform/api
printf '%s\n' '[{"moduleKey":"engagements","enabled":true}]' > .ci-platform/api/modules
docker run --detach --name "$platform_name" --network "$network" \
  -v "$PWD/.ci-platform:/srv:ro" -w /srv \
  python:3.12-alpine python -m http.server 8080 >/dev/null

mkdir -p .ci-secrets
printf '%s' "Server=$sql_name;Database=KingdomEngagements;User ID=sa;Password=$password;TrustServerCertificate=True" \
  > .ci-secrets/ConnectionStrings__EngagementsDatabase
printf '%s' "$redis_name:6379" \
  > .ci-secrets/ConnectionStrings__Redis

docker run --detach --name "$production_app_name" --network "$network" \
  -v "$PWD/.ci-secrets:/run/secrets:ro" \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e AllowedHosts=localhost \
  -e "KingdomOS__HostAccess__PublicBaseUrl=https://coordinate.apostolos.test" \
  -e KingdomOS__DocumentStorage__S3__BucketName=engagements-ci \
  -e KingdomOS__DocumentStorage__S3__Region=us-east-1 \
  -e "KingdomOS__DocumentStorage__S3__ServiceUrl=http://$minio_name:9000" \
  -e KingdomOS__DocumentStorage__S3__AllowInsecureEndpoint=true \
  -e KingdomOS__DocumentStorage__S3__ForcePathStyle=true \
  -e AWS_ACCESS_KEY_ID=minioadmin \
  -e AWS_SECRET_ACCESS_KEY=minioadmin \
  -e "KingdomOS__PlatformInternalUrl=http://$platform_name:8080" \
  -e "KingdomOS__Observability__OtlpEndpoint=http://127.0.0.1:4317" \
  kingdom-engagements:ci >/dev/null

production_ready=false
for attempt in {1..60}; do
  if production_health="$(docker exec "$production_app_name" curl --fail --silent http://localhost:8080/health/ready 2>/dev/null)"; then
    if grep --quiet '"database":"ready"' <<<"$production_health" \
      && grep --quiet '"redis":"healthy"' <<<"$production_health" \
      && grep --quiet '"objectStorage":"healthy"' <<<"$production_health" \
      && grep --quiet '"platformEntitlement":"enabled"' <<<"$production_health"; then
      production_ready=true
      break
    fi
  fi
  sleep 2
done
if [ "$production_ready" != true ]; then
  echo 'Production-mode Engagements did not become ready.' >&2
  docker logs "$production_app_name" >&2 || true
  exit 1
fi

docker exec "$production_app_name" sh -c \
  "curl --fail --silent -D /tmp/health-headers.txt -o /tmp/health-body.json -H 'X-Correlation-ID: ci-production-correlation' http://localhost:8080/health/ready"
docker exec "$production_app_name" grep --ignore-case --quiet \
  '^X-Correlation-ID: ci-production-correlation' /tmp/health-headers.txt
docker logs "$production_app_name" 2>&1 | grep --quiet 'ci-production-correlation'

run_engagements_app() {
  local container_name="$1"

  docker run --detach --name "$container_name" --network "$network" \
    -e ASPNETCORE_ENVIRONMENT=Development \
    -e Database__Provider=SqlServer \
    -e Database__RequireRelational=true \
    -e "ConnectionStrings__EngagementsDatabase=Server=$sql_name;Database=KingdomEngagements;User ID=sa;Password=$password;TrustServerCertificate=True" \
    -e "ConnectionStrings__Redis=$redis_name:6379" \
    -e KingdomOS__DistributedRuntime__RequireRedis=true \
    -e KingdomOS__DocumentStorage__Provider=S3 \
    -e KingdomOS__DocumentStorage__S3__BucketName=engagements-ci \
    -e KingdomOS__DocumentStorage__S3__Region=us-east-1 \
    -e "KingdomOS__DocumentStorage__S3__ServiceUrl=http://$minio_name:9000" \
    -e KingdomOS__DocumentStorage__S3__ForcePathStyle=true \
    -e AWS_ACCESS_KEY_ID=minioadmin \
    -e AWS_SECRET_ACCESS_KEY=minioadmin \
    -e "KingdomOS__PlatformInternalUrl=http://$platform_name:8080" \
    -e KingdomOS__Identity__DemoProfilesEnabled=true \
    -e KingdomOS__Entitlements__BypassInDevelopment=false \
    -e KingdomOS__Entitlements__FailOpenInDevelopment=false \
    kingdom-engagements:ci >/dev/null
}

wait_for_app() {
  local container_name="$1"

  for attempt in {1..60}; do
    if docker exec "$container_name" curl --fail --silent http://localhost:8080/health \
      | grep --quiet '"platformEntitlement":"enabled"'; then
      return 0
    fi
    sleep 2
  done

  echo "Engagements container $container_name never became connected-runtime ready." >&2
  docker exec "$container_name" curl --silent http://localhost:8080/health >&2 || true
  return 1
}

run_engagements_app "$app_name"

wait_for_app "$app_name"

docker exec "$app_name" curl --fail --silent http://localhost:8080/invite/apostle-cynthia \
  | grep --quiet 'Invite Cynthia Thompson'

request_json="$(docker exec -i "$app_name" curl --fail --silent \
  -X POST http://localhost:8080/api/public/engagements/requests \
  -H 'Content-Type: application/json' --data-binary @- <<'JSON'
{
  "organizationName":"CI Covenant Fellowship",
  "eventName":"CI Kingdom Leadership Gathering",
  "eventType":"Leadership Intensive",
  "contactName":"Jordan Ellis",
  "contactEmail":"jordan@example.org",
  "contactPhone":"+1 804 555 0100",
  "city":"Atlanta",
  "state":"Georgia",
  "country":"United States",
  "region":null,
  "timeZone":"America/New_York",
  "venueAddress":"100 Kingdom Way, Atlanta, GA 30303",
  "venueName":"CI Covenant Fellowship",
  "startDate":"2026-09-20",
  "endDate":"2026-09-22",
  "ministryRequest":"Sunday ministry plus a leadership intensive.",
  "expectedAttendance":450,
  "travelCoverageStatus":"not-determined",
  "lodgingCoverageStatus":"yes",
  "honorariumStatus":"yes",
  "travelBookedBy":"not-determined",
  "honorariumAmount":2500,
  "honorariumCurrency":"USD",
  "paymentStatus":"not-due",
  "agreementStatus":"not-started",
  "engagementStatus":"proposed"
}
JSON
)"
request_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$request_json")"

docker exec "$app_name" curl --fail --silent http://localhost:8080/api/engagements/requests \
  | grep --quiet 'CI Kingdom Leadership Gathering'

rfi_json="$(docker exec "$app_name" curl --fail --silent \
  -X POST "http://localhost:8080/api/engagements/requests/$request_id/request-information" \
  -H 'Content-Type: application/json' \
  -d '{"message":"Please confirm who will arrange primary travel."}')"
edit_token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["request"]["editToken"])' <<<"$rfi_json")"

docker exec -i "$app_name" curl --fail --silent \
  -X PUT "http://localhost:8080/api/public/engagements/requests/$edit_token" \
  -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{
  "request": {
    "organizationName":"CI Covenant Fellowship",
    "eventName":"CI Kingdom Leadership Gathering",
    "eventType":"Leadership Intensive",
    "contactName":"Jordan Ellis",
    "contactEmail":"jordan@example.org",
    "contactPhone":"+1 804 555 0100",
    "city":"Atlanta",
    "state":"Georgia",
    "country":"United States",
    "region":null,
    "timeZone":"America/New_York",
    "venueAddress":"100 Kingdom Way, Atlanta, GA 30303",
    "venueName":"CI Covenant Fellowship",
    "startDate":"2026-09-20",
    "endDate":"2026-09-22",
    "ministryRequest":"Sunday ministry plus a leadership intensive.",
    "expectedAttendance":450,
    "travelCoverageStatus":"yes",
    "lodgingCoverageStatus":"yes",
    "honorariumStatus":"yes",
    "travelBookedBy":"host",
    "honorariumAmount":2500,
    "honorariumCurrency":"USD",
    "paymentStatus":"not-due",
    "agreementStatus":"not-started",
    "engagementStatus":"proposed"
  },
  "responseMessage":"The host ministry will book primary travel."
}
JSON

approval_json="$(docker exec "$app_name" curl --fail --silent \
  -X POST "http://localhost:8080/api/engagements/requests/$request_id/approve" \
  -H 'Content-Type: application/json' -d '{}')"
assignment_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["assignmentId"])' <<<"$approval_json")"

docker exec "$app_name" curl --fail --silent "http://localhost:8080/api/engagements/assignments/$assignment_id" \
  | grep --quiet 'CI Kingdom Leadership Gathering'

preparation_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/preparation")"
coordination_status="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["preparation"]["coordinationStatus"])' <<<"$preparation_json")"
terms_token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["preparation"]["termsToken"])' <<<"$preparation_json")"
coordination_token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["preparation"]["coordinationToken"])' <<<"$preparation_json")"
test "$coordination_status" = "locked"
test -z "$terms_token"
test -z "$coordination_token"

host_invitation_json="$(docker exec "$app_name" curl --fail --silent \
  -X POST "http://localhost:8080/api/engagements/assignments/$assignment_id/host-access/invitations" \
  -H 'Content-Type: application/json' -d '{}')"
host_invitation_url="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["invitationUrl"])' <<<"$host_invitation_json")"
host_invitation_token="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.urlparse(sys.stdin.read().strip()).path.rsplit("/", 1)[-1])' <<<"$host_invitation_url")"
test -n "$host_invitation_token"

redemption_page="$(docker exec "$app_name" curl --fail --silent "$host_invitation_url")"
grep --quiet 'Continue to host coordination' <<<"$redemption_page"

docker exec "$app_name" curl --fail --silent \
  -c /tmp/host-cookies.txt \
  -X POST http://localhost:8080/host/access/redeem \
  -F "token=$host_invitation_token" \
  -o /dev/null

data_protection_key_exists="$(docker exec "$redis_name" redis-cli EXISTS ApostolOS:DataProtectionKeys | tr -d '\r')"
test "$data_protection_key_exists" = "1"

run_engagements_app "$second_app_name"
wait_for_app "$second_app_name"

docker exec "$app_name" cat /tmp/host-cookies.txt \
  | docker exec -i "$second_app_name" sh -c 'cat > /tmp/host-cookies.txt'

docker exec "$second_app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  http://localhost:8080/api/host/engagement/terms \
  | grep --quiet '"termsStatus":"pending"'

host_terms_json="$(docker exec "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  http://localhost:8080/api/host/engagement/terms)"
grep --quiet '"termsStatus":"pending"' <<<"$host_terms_json"

docker exec "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  http://localhost:8080/host/terms \
  | grep --quiet 'Accepted engagement terms'

accepted_json="$(docker exec "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  -X POST http://localhost:8080/api/host/engagement/terms/accept \
  -H 'Content-Type: application/json' \
  -d '{"accepted":true,"signatoryName":"Pastor Jordan Ellis","signatoryEmail":"jordan@example.org","note":"Confirmed for CI."}')"
grep --quiet '"coordinationUrl":"/host/coordination"' <<<"$accepted_json"

docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/requests/$request_id" \
  | grep --quiet '"agreementStatus":"signed"'

docker exec "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  http://localhost:8080/host/coordination \
  | grep --quiet 'Host coordination'

docker exec -i "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  -X PUT http://localhost:8080/api/host/engagement/coordination \
  -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{
  "outboundAirline":"Delta",
  "outboundFlightNumber":"DL1201",
  "outboundConfirmationNumber":"CI123",
  "outboundDepartureAirport":"RIC",
  "outboundArrivalAirport":"ATL",
  "outboundDepartsAtUtc":"2026-09-20T10:00:00Z",
  "outboundArrivesAtUtc":"2026-09-20T11:30:00Z",
  "returnAirline":"Delta",
  "returnFlightNumber":"DL1202",
  "returnConfirmationNumber":"CI123",
  "returnDepartureAirport":"ATL",
  "returnArrivalAirport":"RIC",
  "returnDepartsAtUtc":"2026-09-22T18:00:00Z",
  "returnArrivesAtUtc":"2026-09-22T19:30:00Z",
  "hotelName":"Covenant Hotel",
  "hotelAddress":"200 Peachtree Street, Atlanta, GA",
  "hotelConfirmationNumber":"HOTEL-77",
  "hotelCheckInAtUtc":"2026-09-20T16:00:00Z",
  "hotelCheckOutAtUtc":"2026-09-22T11:00:00Z",
  "transportationPlan":"Host driver will handle airport and venue transportation.",
  "pickupContactName":"Naomi Brooks",
  "pickupContactPhone":"+1 404 555 0199",
  "schedule":[{"title":"Leadership intensive","date":"2026-09-21","startsAt":"09:00","endsAt":"12:00","location":"Main Sanctuary","notes":"Leadership team only"}],
  "contacts":[{"type":"primary","name":"Pastor Jordan Ellis","email":"jordan@example.org","phone":"+1 804 555 0100"},{"type":"media","name":"Alex Green","email":"media@example.org","phone":"+1 404 555 0110"}],
  "promotionRequirements":"Use the approved CTG image and biography.",
  "prayerFocus":"Leadership renewal and regional alignment.",
  "hostNotes":"Green room available one hour before each session.",
  "submit":true
}
JSON

docker exec "$app_name" sh -c "printf 'final host schedule' > /tmp/final-schedule.txt"
document_json="$(docker exec "$app_name" curl --fail --silent \
  -b /tmp/host-cookies.txt \
  -X POST http://localhost:8080/api/host/engagement/coordination/documents \
  -F 'file=@/tmp/final-schedule.txt;type=text/plain')"
document_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$document_json")"
document_id_compact="${document_id//-/}"

storage_row="$(docker exec "$sql_name" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$password" -C \
  -d KingdomEngagements -h -1 -W -s '|' \
  -Q "SET NOCOUNT ON; SELECT [StorageProvider], DATALENGTH([Content]) FROM [dbo].[EngagementHostCoordinationDocuments] WHERE [Id] = '$document_id'")"
storage_provider="$(cut -d '|' -f 1 <<<"$storage_row" | xargs)"
stored_content_length="$(cut -d '|' -f 2 <<<"$storage_row" | xargs)"
test "$storage_provider" = "s3"
test "$stored_content_length" = "0"

docker exec "$minio_name" mc ls --recursive local/engagements-ci \
  | grep --quiet "$document_id_compact"

docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/preparation/documents/$document_id" \
  | grep --quiet 'final host schedule'

assignment_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id")"
grep --quiet '"travelStatus":"confirmed"' <<<"$assignment_json"
grep --quiet '"lodgingStatus":"confirmed"' <<<"$assignment_json"
grep --quiet '"transportationStatus":"confirmed"' <<<"$assignment_json"
grep --quiet '"hostStatus":"confirmed"' <<<"$assignment_json"
grep --quiet '"documentsStatus":"received"' <<<"$assignment_json"
grep --quiet 'Complete host coordination' <<<"$assignment_json"
grep --quiet 'final-schedule.txt' <<<"$assignment_json"

workspace_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace")"
grep --quiet '"overallPercent":100' <<<"$workspace_json"
grep --quiet 'Leadership intensive' <<<"$workspace_json"
grep --quiet 'Leadership renewal and regional alignment' <<<"$workspace_json"
grep --quiet 'Host preparation submitted' <<<"$workspace_json"

docker exec -i "$app_name" curl --fail --silent \
  -X PUT "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace/coordination" \
  -H 'Content-Type: application/json' --data-binary @- >/dev/null <<'JSON'
{
  "outboundAirline":"Delta",
  "outboundFlightNumber":"DL1201",
  "outboundConfirmationNumber":"CI123",
  "outboundDepartureAirport":"RIC",
  "outboundArrivalAirport":"ATL",
  "outboundDepartsAtUtc":"2026-09-20T10:00:00Z",
  "outboundArrivesAtUtc":"2026-09-20T11:30:00Z",
  "returnAirline":"Delta",
  "returnFlightNumber":"DL1202",
  "returnConfirmationNumber":"CI123",
  "returnDepartureAirport":"ATL",
  "returnArrivalAirport":"RIC",
  "returnDepartsAtUtc":"2026-09-22T18:00:00Z",
  "returnArrivesAtUtc":"2026-09-22T19:30:00Z",
  "hotelName":"Covenant Hotel",
  "hotelAddress":"200 Peachtree Street, Atlanta, GA",
  "hotelConfirmationNumber":"HOTEL-77",
  "hotelCheckInAtUtc":"2026-09-20T16:00:00Z",
  "hotelCheckOutAtUtc":"2026-09-22T11:00:00Z",
  "transportationPlan":"Host driver will handle airport and venue transportation.",
  "pickupContactName":"Naomi Brooks",
  "pickupContactPhone":"+1 404 555 0199",
  "schedule":[{"title":"Leadership intensive","date":"2026-09-21","startsAt":"09:00","endsAt":"12:00","location":"Main Sanctuary","notes":"Leadership team only"}],
  "contacts":[{"type":"primary","name":"Pastor Jordan Ellis","email":"jordan@example.org","phone":"+1 804 555 0100"},{"type":"media","name":"Alex Green","email":"media@example.org","phone":"+1 404 555 0110"}],
  "promotionRequirements":"Use the approved CTG image and biography.",
  "prayerFocus":"Leadership renewal and regional alignment.",
  "hostNotes":"Ministry team verified the host preparation record.",
  "submit":false
}
JSON

workspace_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace")"
grep --quiet 'Ministry team verified the host preparation record' <<<"$workspace_json"
grep --quiet 'Coordination details updated' <<<"$workspace_json"
grep --quiet '"coordinationStatus":"submitted"' <<<"$workspace_json"

docker exec "$app_name" sh -c "printf 'ministry team packet' > /tmp/ministry-packet.txt"
ministry_document_json="$(docker exec "$app_name" curl --fail --silent \
  -X POST "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace/documents" \
  -F 'file=@/tmp/ministry-packet.txt;type=text/plain')"
ministry_document_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$ministry_document_json")"

docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/preparation/documents/$ministry_document_id" \
  | grep --quiet 'ministry team packet'

workspace_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace")"
grep --quiet 'Assignment document added' <<<"$workspace_json"
grep --quiet 'ministry-packet.txt' <<<"$workspace_json"

docker exec "$app_name" curl --fail --silent \
  -X DELETE "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace/documents/$ministry_document_id" >/dev/null

workspace_json="$(docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/assignments/$assignment_id/workspace")"
grep --quiet 'Assignment document removed' <<<"$workspace_json"
grep --quiet '"overallPercent":100' <<<"$workspace_json"

docker exec "$app_name" curl --fail --silent http://localhost:8080/api/engagements/assignments \
  | grep --quiet 'Kingdom Leadership Gathering'