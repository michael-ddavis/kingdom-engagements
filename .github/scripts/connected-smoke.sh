#!/usr/bin/env bash
set -euo pipefail

network="engagements-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
sql_name="engagements-sql"
platform_name="engagements-platform"
app_name="engagements-app"
password='LocalKingdom0S!'

cleanup() {
  docker logs "$app_name" 2>/dev/null || true
  docker rm --force "$app_name" "$platform_name" "$sql_name" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf .ci-platform
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

mkdir -p .ci-platform/api
printf '%s\n' '[{"moduleKey":"engagements","enabled":true}]' > .ci-platform/api/modules
docker run --detach --name "$platform_name" --network "$network" \
  -v "$PWD/.ci-platform:/srv:ro" -w /srv \
  python:3.12-alpine python -m http.server 8080 >/dev/null

docker run --detach --name "$app_name" --network "$network" \
  -e ASPNETCORE_ENVIRONMENT=Development \
  -e Database__Provider=SqlServer \
  -e "ConnectionStrings__EngagementsDatabase=Server=$sql_name;Database=KingdomEngagements;User ID=sa;Password=$password;TrustServerCertificate=True" \
  -e "KingdomOS__PlatformInternalUrl=http://$platform_name:8080" \
  -e KingdomOS__Entitlements__BypassInDevelopment=false \
  -e KingdomOS__Entitlements__FailOpenInDevelopment=false \
  kingdom-engagements:ci >/dev/null

live=false
for attempt in {1..30}; do
  if docker exec "$app_name" curl --fail --silent http://localhost:8080/health/live \
    | grep --quiet '"module":"engagements"'; then
    live=true
    break
  fi
  sleep 1
done
if [ "$live" != true ]; then
  echo 'Engagements process never became live.' >&2
  exit 1
fi

ready=false
for attempt in {1..60}; do
  if docker exec "$app_name" curl --fail --silent http://localhost:8080/health \
    | grep --quiet '"platformEntitlement":"enabled"'; then
    ready=true
    break
  fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo 'Engagements never became connected-runtime ready.' >&2
  docker exec "$app_name" curl --silent http://localhost:8080/health >&2 || true
  exit 1
fi

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
terms_token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["preparation"]["termsToken"])' <<<"$preparation_json")"
coordination_status="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["preparation"]["coordinationStatus"])' <<<"$preparation_json")"
test "$coordination_status" = "locked"

docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/public/engagements/preparation/terms/$terms_token" \
  | grep --quiet '"termsStatus":"pending"'

docker exec "$app_name" curl --fail --silent "http://localhost:8080/host/terms/$terms_token" \
  | grep --quiet 'Accepted engagement terms'

accepted_json="$(docker exec "$app_name" curl --fail --silent \
  -X POST "http://localhost:8080/api/public/engagements/preparation/terms/$terms_token/accept" \
  -H 'Content-Type: application/json' \
  -d '{"accepted":true,"signatoryName":"Pastor Jordan Ellis","signatoryEmail":"jordan@example.org","note":"Confirmed for CI."}')"
coordination_token="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["terms"]["coordinationToken"])' <<<"$accepted_json")"

docker exec "$app_name" curl --fail --silent \
  "http://localhost:8080/api/engagements/requests/$request_id" \
  | grep --quiet '"agreementStatus":"signed"'

docker exec "$app_name" curl --fail --silent "http://localhost:8080/host/coordination/$coordination_token" \
  | grep --quiet 'Host coordination'

docker exec -i "$app_name" curl --fail --silent \
  -X PUT "http://localhost:8080/api/public/engagements/preparation/coordination/$coordination_token" \
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
  -X POST "http://localhost:8080/api/public/engagements/preparation/coordination/$coordination_token/documents" \
  -F 'file=@/tmp/final-schedule.txt;type=text/plain')"
document_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$document_json")"

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