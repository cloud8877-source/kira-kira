#!/usr/bin/env bash
# Usage: ./scripts/e2e-check.sh <base-url> [test-bill-id]
set -euo pipefail

BASE_URL="${1:-}"
TEST_BILL_ID="${2:-${TEST_BILL_ID:-}}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 <base-url> [test-bill-id]"
  exit 1
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check() {
  local name="$1"; local url="$2"; local expected_status="$3"; local expected_type="${4:-}"
  local response
  response=$(curl -sS -o /dev/null -w '%{http_code}|%{content_type}' "$url")
  local status="${response%|*}"
  local ctype="${response#*|}"
  if [ "$status" != "$expected_status" ]; then
    echo -e "${RED}❌ $name: expected $expected_status, got $status${NC}"
    exit 1
  fi
  if [ -n "$expected_type" ] && [[ "$ctype" != *"$expected_type"* ]]; then
    echo -e "${RED}❌ $name: expected content-type $expected_type, got $ctype${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ $name${NC}"
}

echo "Testing $BASE_URL..."

check "Landing page 200" "$BASE_URL/" "200" "text/html"
check "Health endpoint OK" "$BASE_URL/api/health" "200" "application/json"
check "Static OG card served" "$BASE_URL/og.png" "200" "image/png"
check "Wrong-secret admin → 404" "$BASE_URL/b/notarealbill/admin?k=fake" "404"
check "Wrong-secret poll → 404" "$BASE_URL/b/notarealbill/admin/poll?k=fake" "404"

if [ -n "$TEST_BILL_ID" ]; then
  check "Public bill page" "$BASE_URL/b/$TEST_BILL_ID" "200" "text/html"
fi

echo ""
echo -e "${GREEN}All checks passed${NC}"
