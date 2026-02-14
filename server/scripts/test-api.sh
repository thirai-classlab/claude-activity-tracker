#!/bin/bash
# =============================================================================
# API integration test script for Claude Code Activity Tracker
# Usage: bash scripts/test-api.sh [API_URL] [API_KEY]
# =============================================================================

API_URL="${1:-http://localhost:3001}"
API_KEY="${2:-dev-api-key-change-in-production}"

PASS=0
FAIL=0
SESSION_UUID="test-$(date +%s)-$(( RANDOM ))"
AGENT_UUID="agent-$(date +%s)-$(( RANDOM ))"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Claude Activity Tracker - API Tests${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "  URL:          ${API_URL}"
echo -e "  Session UUID: ${SESSION_UUID}"
echo ""

# ---------------------------------------------------------------------------
# Helper function
# ---------------------------------------------------------------------------
test_endpoint() {
  local method="$1"
  local path="$2"
  local label="$3"
  local data="$4"
  local expected_status="${5:-200}"

  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /tmp/test_api_body.txt -w "%{http_code}" \
      -H "x-api-key: ${API_KEY}" \
      "${API_URL}${path}" 2>/dev/null)
  else
    response=$(curl -s -o /tmp/test_api_body.txt -w "%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "x-api-key: ${API_KEY}" \
      -d "$data" \
      "${API_URL}${path}" 2>/dev/null)
  fi

  body=$(cat /tmp/test_api_body.txt 2>/dev/null)

  if [ "$response" = "$expected_status" ]; then
    echo -e "  ${GREEN}PASS${NC}  ${method} ${path}"
    echo -e "        Status: ${response} | Body: $(echo "$body" | head -c 120)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  ${method} ${path}"
    echo -e "        Expected: ${expected_status} | Got: ${response}"
    echo -e "        Body: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# ===== 1. Health check =====================================================

echo -e "${YELLOW}--- Health Check ---${NC}"
test_endpoint "GET" "/health" "Health check"

# ===== 2. Hook: session-start ==============================================

echo -e "${YELLOW}--- Hook Endpoints ---${NC}"
test_endpoint "POST" "/api/hook/session-start" "Session Start" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"model\": \"claude-sonnet-4-5-20250929\",
    \"source\": \"vscode\",
    \"permission_mode\": \"default\",
    \"cwd\": \"/home/test/projects/my-app\",
    \"git_repo\": \"my-app\",
    \"git_branch\": \"main\",
    \"git_user\": \"test@example.com\",
    \"claude_account\": \"test@example.com\",
    \"ip_address\": \"127.0.0.1\",
    \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

# ===== 3. Hook: prompt =====================================================

test_endpoint "POST" "/api/hook/prompt" "Prompt" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"prompt_text\": \"このファイルの構造を確認して\",
    \"submitted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

# ===== 4. Hook: subagent-start =============================================

test_endpoint "POST" "/api/hook/subagent-start" "Subagent Start" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"agent_uuid\": \"${AGENT_UUID}\",
    \"agent_type\": \"Explore\",
    \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

# ===== 5. Hook: subagent-stop ==============================================

test_endpoint "POST" "/api/hook/subagent-stop" "Subagent Stop" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"agent_uuid\": \"${AGENT_UUID}\",
    \"agent_type\": \"Explore\",
    \"stopped_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"input_tokens\": 5000,
    \"output_tokens\": 1200,
    \"cache_creation_tokens\": 500,
    \"cache_read_tokens\": 2000,
    \"agent_model\": \"claude-sonnet-4-5-20250929\",
    \"tool_uses\": [
      {
        \"tool_use_uuid\": \"tu-sub-$(date +%s)\",
        \"tool_name\": \"Read\",
        \"tool_category\": \"search\",
        \"tool_input_summary\": \"src/index.ts\",
        \"status\": \"success\"
      }
    ]
  }"

# ===== 6. Hook: stop =======================================================

test_endpoint "POST" "/api/hook/stop" "Stop (transcript parse)" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"stopped_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"claude_account\": \"test@example.com\",
    \"git_user\": \"test@example.com\",
    \"git_repo\": \"my-app\",
    \"git_branch\": \"main\",
    \"ip_address\": \"127.0.0.1\",
    \"model\": \"claude-sonnet-4-5-20250929\",
    \"total_input_tokens\": 25000,
    \"total_output_tokens\": 8000,
    \"total_cache_creation_tokens\": 3000,
    \"total_cache_read_tokens\": 12000,
    \"turn_count\": 3,
    \"tool_use_count\": 5,
    \"compact_count\": 0,
    \"error_count\": 0,
    \"summary\": \"ファイル構造の確認とコードレビューを実施\",
    \"tool_uses\": [
      {
        \"tool_use_uuid\": \"tu-1-$(date +%s)\",
        \"tool_name\": \"Read\",
        \"tool_category\": \"search\",
        \"tool_input_summary\": \"src/index.ts\",
        \"status\": \"success\"
      },
      {
        \"tool_use_uuid\": \"tu-2-$(date +%s)\",
        \"tool_name\": \"Grep\",
        \"tool_category\": \"search\",
        \"tool_input_summary\": \"handleSessionStart in src/\",
        \"status\": \"success\"
      },
      {
        \"tool_use_uuid\": \"tu-3-$(date +%s)\",
        \"tool_name\": \"Edit\",
        \"tool_category\": \"file_edit\",
        \"tool_input_summary\": \"src/services/hookService.ts\",
        \"status\": \"success\"
      },
      {
        \"tool_use_uuid\": \"tu-4-$(date +%s)\",
        \"tool_name\": \"Bash\",
        \"tool_category\": \"bash\",
        \"tool_input_summary\": \"npm test\",
        \"status\": \"error\",
        \"error_message\": \"Exit code 1\"
      },
      {
        \"tool_use_uuid\": \"tu-5-$(date +%s)\",
        \"tool_name\": \"mcp__github__search_code\",
        \"tool_category\": \"mcp\",
        \"tool_input_summary\": \"query=handleSessionStart repo=my-org/my-app\",
        \"status\": \"success\"
      }
    ],
    \"file_changes\": [
      { \"file_path\": \"src/services/hookService.ts\", \"operation\": \"edit\" },
      { \"file_path\": \"src/utils/helpers.ts\", \"operation\": \"create\" },
      { \"file_path\": \"src/index.ts\", \"operation\": \"read\" }
    ],
    \"session_events\": [
      {
        \"event_type\": \"tool_error\",
        \"event_subtype\": \"non_zero_exit\",
        \"event_data\": { \"tool\": \"Bash\", \"command\": \"npm test\", \"exit_code\": 1 }
      }
    ],
    \"turn_durations\": [
      { \"durationMs\": 1200 },
      { \"durationMs\": 3500 },
      { \"durationMs\": 800 }
    ]
  }"

# ===== 7. Hook: session-end ================================================

test_endpoint "POST" "/api/hook/session-end" "Session End" \
  "{
    \"session_uuid\": \"${SESSION_UUID}\",
    \"reason\": \"user_exit\",
    \"ended_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

# ===== 8. Dashboard endpoints ==============================================

echo -e "${YELLOW}--- Dashboard Endpoints ---${NC}"
test_endpoint "GET" "/api/dashboard/stats" "Dashboard Stats"
test_endpoint "GET" "/api/dashboard/sessions" "Dashboard Sessions"

# ===== Summary ==============================================================

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} Test Results${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
TOTAL=$((PASS + FAIL))
echo -e "  Total:  ${TOTAL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}Some tests FAILED!${NC}"
  exit 1
else
  echo -e "  ${GREEN}All tests PASSED!${NC}"
  exit 0
fi
