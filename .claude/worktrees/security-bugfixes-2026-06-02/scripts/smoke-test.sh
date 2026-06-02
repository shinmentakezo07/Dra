#!/usr/bin/env bash
set -euo pipefail

# Smoke Test — verifies the entire DRA stack is wired and functional.
# Agents should run this after any significant change to catch broken wiring,
# missing logic, or unmocked components.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

log_pass() { echo -e "${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
log_fail() { echo -e "${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; WARN=$((WARN+1)); }

echo "========================================"
echo "DRA Platform Smoke Test"
echo "========================================"
echo ""

# 1. Check Go backend compiles
echo "--- Go Backend ---"
if ! command -v go >/dev/null 2>&1; then
  log_warn "Go not installed — skipping compilation check"
elif (cd apps/backend && go build ./... 2>/dev/null); then
  log_pass "Go backend compiles"
else
  log_fail "Go backend compilation failed"
fi

# 2. Check for mock data in dashboard components
echo ""
echo "--- Mock Data Audit ---"
MOCK_FILES=$(grep -r "const mock" apps/web/app/dashboard --include="*.tsx" -l 2>/dev/null || true)
if [ -z "$MOCK_FILES" ]; then
  log_pass "No mock data found in dashboard components"
else
  log_fail "Mock data still present in: $MOCK_FILES"
fi

# 3. Check dashboard components import SDK
echo ""
echo "--- SDK Import Audit ---"
for file in apps/web/app/dashboard/keys/KeysClient.tsx apps/web/app/dashboard/logs/LogsClient.tsx apps/web/app/dashboard/analytics/AnalyticsClient.tsx apps/web/app/dashboard/DashboardOverviewClient.tsx; do
  if grep -q 'from "@/lib/api/sdk"' "$file"; then
    log_pass "$(basename $file) imports SDK"
  else
    log_fail "$(basename $file) missing SDK import"
  fi
done

# 4. Check API routes exist for all backend endpoints
echo ""
echo "--- API Route Coverage ---"
EXPECTED_ROUTES=("keys" "logs" "analytics" "credits" "models" "transactions" "admin/users" "admin/stats")
for route in "${EXPECTED_ROUTES[@]}"; do
  if [ -d "apps/web/app/api/$route" ] || [ -f "apps/web/app/api/$route/route.ts" ]; then
    log_pass "API route exists: /api/$route"
  else
    log_warn "API route missing: /api/$route"
  fi
done

# 5. Check chat route has SSE conversion
echo ""
echo "--- Chat Stream Wiring ---"
if grep -q "encodeDataStream" apps/web/app/api/chat/route.ts && grep -q "encodeStreamFinish" apps/web/app/api/chat/route.ts; then
  log_pass "Chat route converts OpenAI SSE → Vercel Data Stream"
else
  log_fail "Chat route missing SSE conversion logic"
fi

# 6. Check backend test files exist
echo ""
echo "--- Test Infrastructure ---"
BACKEND_TESTS=("internal/domain/domain_test.go" "internal/middleware/auth_test.go" "internal/handler/handler_test.go" "tests/integration/integration_test.go")
for test in "${BACKEND_TESTS[@]}"; do
  if [ -f "apps/backend/$test" ]; then
    log_pass "Backend test exists: $test"
  else
    log_warn "Backend test missing: $test"
  fi
done

FRONTEND_TESTS=("tests/lib/api/sdk.test.ts" "tests/lib/api/errors.test.ts" "tests/wiring-verification.test.ts")
for test in "${FRONTEND_TESTS[@]}"; do
  if [ -f "apps/web/$test" ]; then
    log_pass "Frontend test exists: $test"
  else
    log_warn "Frontend test missing: $test"
  fi
done

# 7. Check environment example has required vars
echo ""
echo "--- Environment Configuration ---"
REQUIRED_ENVS=("BACKEND_URL" "DATABASE_URL" "AUTH_SECRET")
for var in "${REQUIRED_ENVS[@]}"; do
  if grep -q "^$var=" apps/web/.env.example; then
    log_pass ".env.example defines $var"
  else
    log_warn ".env.example missing $var"
  fi
done

# 8. Summary
echo ""
echo "========================================"
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "========================================"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}SMOKE TEST FAILED${NC}"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}SMOKE TEST PASSED WITH WARNINGS${NC}"
  exit 0
else
  echo -e "${GREEN}SMOKE TEST PASSED${NC}"
  exit 0
fi
