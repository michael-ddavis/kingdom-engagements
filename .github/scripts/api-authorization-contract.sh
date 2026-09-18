#!/usr/bin/env bash
set -euo pipefail

app_name="${1:?Pass the running Engagements container name or id.}"
response_body=''
response_status=''

request() {
  local method="$1"
  local path="$2"
  local role="${3:-}"
  local organization="${4:-ctg}"
  local body="${5:-}"
  local -a args=(
    curl --silent --show-error
    --request "$method"
    --write-out $'\n%{http_code}'
    --header "X-Kingdom-Demo-Organization: $organization"
  )

  if [ -n "$role" ]; then
    args+=(--header "X-Kingdom-Engagements-Demo-Role: $role")
  fi
  if [ -n "$body" ]; then
    args+=(--header 'Content-Type: application/json' --data "$body")
  fi

  local response
  response="$(docker exec "$app_name" "${args[@]}" "http://localhost:8080$path")"
  response_status="${response##*$'\n'}"
  response_body="${response%$'\n'*}"
}

expect_status() {
  local expected="$1"
  local description="$2"
  if [ "$response_status" != "$expected" ]; then
    echo "$description: expected HTTP $expected, received $response_status" >&2
    echo "$response_body" >&2
    exit 1
  fi
}

expect_body() {
  local expected="$1"
  local description="$2"
  if ! grep --fixed-strings --quiet -- "$expected" <<<"$response_body"; then
    echo "$description: response did not contain $expected" >&2
    echo "$response_body" >&2
    exit 1
  fi
}

request GET /api/engagements/demo-persona apostle
expect_status 200 'Apostle persona'
expect_body '"role":"apostle"' 'Apostle persona'
expect_body '"canManageAssignments":false' 'Apostle persona'
expect_body '"canCompleteEngagements":false' 'Apostle persona'

request GET /api/engagements/assignments apostle
expect_status 200 'Apostle assignment access'

assignment_key="authorization-contract-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
assignment_payload="{\"externalAssignmentId\":\"$assignment_key\",\"title\":\"Authorization Contract Assignment\",\"speakerName\":\"Cynthia Thompson\",\"hostOrganization\":\"Contract Test Fellowship\",\"startsAtUtc\":\"2027-01-15T15:00:00Z\",\"endsAtUtc\":\"2027-01-15T18:00:00Z\",\"location\":\"Richmond, Virginia\"}"

request POST /api/engagements/assignments apostle ctg "$assignment_payload"
expect_status 403 'Apostle write protection'

request POST /api/engagements/assignments coordinator ctg "$assignment_payload"
expect_status 200 'Coordinator assignment creation'
expect_body "$assignment_key" 'Coordinator assignment creation'
assignment_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["summary"]["id"])' <<<"$response_body")"

request PUT "/api/engagements/assignments/$assignment_id/closeout" coordinator ctg \
  '{"eventNotes":"Contract test","testimonySummary":null,"hostFollowUpComplete":true,"hostFollowUpNotes":null,"finalDocumentsComplete":true,"paymentComplete":true,"administrativeFollowUpComplete":true,"outcomesRecorded":true,"complete":true}'
expect_status 403 'Coordinator completion protection'

request GET /api/engagements/assignments coordinator divine-world-changers
expect_status 200 'Alternate tenant assignment access'
if grep --fixed-strings --quiet -- "$assignment_key" <<<"$response_body"; then
  echo 'Tenant isolation: CTG assignment was visible to another organization.' >&2
  exit 1
fi

request GET /api/engagements/assignments minister
expect_status 403 'Minister full-list protection'

request GET /api/engagements/requests minister
expect_status 403 'Minister Booking Desk protection'

request GET /api/engagements/my-assignments minister
expect_status 200 'Minister assigned-engagement access'
python3 -c '
import json, sys
allowed = {"assignment-demo-001", "assignment-demo-002", "assignment-demo-007"}
items = json.load(sys.stdin)
if not items:
    raise SystemExit("Minister characterization expected seeded assignments.")
unexpected = [item.get("externalAssignmentId") for item in items if item.get("externalAssignmentId") not in allowed]
if unexpected:
    raise SystemExit(f"Minister received out-of-scope assignments: {unexpected}")
' <<<"$response_body"

request GET /api/public/engagements/requests/not-a-real-token
expect_status 404 'Invalid public host token'
expect_body 'invalid, expired, or no longer needed' 'Invalid public host token'

request GET /api/engagements/demo-persona apostle not-an-organization
expect_status 400 'Unknown organization protection'
expect_body 'selected demo organization is not available' 'Unknown organization protection'

echo 'Engagements API and authorization contract passed.'
