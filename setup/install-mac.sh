#!/bin/bash
# ============================================================
# Claude Code Activity Tracker - macOS Setup Script
# ============================================================
# Usage: bash install-mac.sh
# ============================================================

set -e

CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOKS_SRC="$SCRIPT_DIR/hooks"

echo "========================================"
echo " Claude Code Activity Tracker Installer"
echo " for macOS"
echo "========================================"
echo ""

# --- 1. Prerequisites Check ---
echo "[1/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "  Install with: brew install node"
    exit 1
fi

NODE_VER=$(node -v)
echo "  Node.js: $NODE_VER"

if ! command -v git &> /dev/null; then
    echo "WARNING: git not found (git info collection will be affected)"
fi

echo "  OK"
echo ""

# --- 2. API Connection Settings ---
echo "[2/6] Configuring API connection..."

# Read existing config.json
EXISTING_API_URL=""
EXISTING_API_KEY=""
EXISTING_DEBUG=""
CONFIG_FILE="$HOOKS_DIR/config.json"
if [ -f "$CONFIG_FILE" ]; then
    EXISTING_API_URL=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).api_url||'')}catch{}" 2>/dev/null)
    EXISTING_API_KEY=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).api_key||'')}catch{}" 2>/dev/null)
    EXISTING_DEBUG=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).debug===true?'true':'false')}catch{}" 2>/dev/null)
fi

# Read default config.json from distribution source
DEFAULT_SRC_URL=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$HOOKS_SRC/config.json','utf8')).api_url||'')}catch{}" 2>/dev/null)
DEFAULT_SRC_KEY=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$HOOKS_SRC/config.json','utf8')).api_key||'')}catch{}" 2>/dev/null)

# API URL (existing > default > localhost priority)
DEFAULT_URL="${EXISTING_API_URL:-${DEFAULT_SRC_URL:-http://localhost:3001}}"
read -p "  API URL [$DEFAULT_URL]: " API_URL
API_URL="${API_URL:-$DEFAULT_URL}"

# API Key (skip if existing or default available)
if [ -n "$EXISTING_API_KEY" ]; then
    API_KEY="$EXISTING_API_KEY"
    echo "  API Key: (using existing)"
elif [ -n "$DEFAULT_SRC_KEY" ]; then
    API_KEY="$DEFAULT_SRC_KEY"
    echo "  API Key: (using default)"
else
    echo "  API Key (enter the key shared by your admin)"
    read -p "  API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "  WARNING: API Key is empty. Data will be rejected if server auth is enabled."
    fi
fi

# Debug mode
DEFAULT_DEBUG="${EXISTING_DEBUG:-false}"
if [ "$DEFAULT_DEBUG" = "true" ]; then
    DEBUG_DEFAULT="Y"
else
    DEBUG_DEFAULT="N"
fi
read -p "  Debug mode (y/N) [$DEBUG_DEFAULT]: " DEBUG_MODE
if [ -z "$DEBUG_MODE" ]; then
    DEBUG_FLAG="$DEFAULT_DEBUG"
elif [ "$DEBUG_MODE" = "y" ] || [ "$DEBUG_MODE" = "Y" ]; then
    DEBUG_FLAG="true"
else
    DEBUG_FLAG="false"
fi

echo ""
echo "  Configuration:"
echo "    API URL:  $API_URL"
if [ -n "$API_KEY" ]; then echo "    API Key:  (set)"; else echo "    API Key:  (not set)"; fi
echo "    Debug:    $DEBUG_FLAG"
echo ""

# --- 3. Directory Creation & Hook File Copy ---
echo "[3/6] Installing hook files..."

mkdir -p "$HOOKS_DIR"
mkdir -p "$HOOKS_DIR/shared"

# Copy 6 hook files
for FILE in aidd-log-session-start.js aidd-log-prompt.js aidd-log-subagent-start.js aidd-log-subagent-stop.js aidd-log-stop.js aidd-log-session-end.js; do
    if [ -f "$HOOKS_SRC/$FILE" ]; then
        cp "$HOOKS_SRC/$FILE" "$HOOKS_DIR/$FILE"
        echo "  Copy: $FILE"
    else
        echo "  ERROR: $HOOKS_SRC/$FILE not found"
        exit 1
    fi
done

# Copy shared module
if [ -f "$HOOKS_SRC/shared/utils.js" ]; then
    cp "$HOOKS_SRC/shared/utils.js" "$HOOKS_DIR/shared/utils.js"
    echo "  Copy: shared/utils.js"
else
    echo "  ERROR: $HOOKS_SRC/shared/utils.js not found"
    exit 1
fi

# Copy package.json
if [ -f "$HOOKS_SRC/package.json" ]; then
    cp "$HOOKS_SRC/package.json" "$HOOKS_DIR/package.json"
    echo "  Copy: package.json"
else
    echo "  ERROR: $HOOKS_SRC/package.json not found"
    exit 1
fi

# Create/update config.json
cat > "$HOOKS_DIR/config.json" << EOF
{
  "api_url": "$API_URL",
  "api_key": "$API_KEY",
  "debug": $DEBUG_FLAG
}
EOF
echo "  Create: config.json"
echo ""

# --- 4. npm dependency pre-install ---
echo "[4/6] Pre-installing npm packages..."

LEVELDB_DIR="$(node -e "console.log(require('os').tmpdir())")/claude-hook-leveldb"
if [ ! -d "$LEVELDB_DIR/node_modules/classic-level" ]; then
    mkdir -p "$LEVELDB_DIR"
    (cd "$LEVELDB_DIR" && npm install --silent classic-level 2>&1) || echo "  WARNING: classic-level installation failed (affects email cache)"
    echo "  Installed: classic-level"
else
    echo "  Already installed: classic-level"
fi
echo ""

# --- 5. Update global settings.json ---
echo "[5/6] Updating Claude Code global settings..."

HOOKS_ABS_PATH="$HOOKS_DIR"

node -e "
const fs = require('fs');
const settingsPath = '$SETTINGS_FILE';
const hooksDir = '$HOOKS_ABS_PATH';

let settings = {};
if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
}

if (!settings.hooks) settings.hooks = {};

// Tracker hook definitions
const trackerHooks = {
    SessionStart:      { command: 'node \"' + hooksDir + '/aidd-log-session-start.js\"', timeout: 15 },
    UserPromptSubmit:  { command: 'node \"' + hooksDir + '/aidd-log-prompt.js\"', timeout: 10 },
    SubagentStart:     { command: 'node \"' + hooksDir + '/aidd-log-subagent-start.js\"', timeout: 10 },
    SubagentStop:      { command: 'node \"' + hooksDir + '/aidd-log-subagent-stop.js\"', timeout: 15 },
    Stop:              { command: 'node \"' + hooksDir + '/aidd-log-stop.js\"', timeout: 30 },
    SessionEnd:        { command: 'node \"' + hooksDir + '/aidd-log-session-end.js\"', timeout: 10 },
};

for (const [event, def] of Object.entries(trackerHooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    // Remove existing tracker hooks (reinstall support)
    for (const group of settings.hooks[event]) {
        if (group.hooks) {
            group.hooks = group.hooks.filter(h => !h.command || !h.command.includes('/hooks/aidd-log-'));
        }
    }
    // Remove empty groups
    settings.hooks[event] = settings.hooks[event].filter(g => g.hooks && g.hooks.length > 0);

    // Add tracker hook
    settings.hooks[event].push({
        matcher: '',
        hooks: [{ type: 'command', command: def.command, timeout: def.timeout }]
    });
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
console.log('  Updated: ' + settingsPath);
"
echo ""

# --- 6. Health Check ---
echo "[6/6] API server health check..."
echo ""

HEALTH_RESPONSE=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null) || true
if [ -n "$HEALTH_RESPONSE" ]; then
    echo "    $API_URL/health -> OK"
    echo "    Response: $HEALTH_RESPONSE"
else
    echo "    $API_URL/health -> Cannot connect"
    echo "    WARNING: API server may not be running"
fi
echo ""

# Hook tests
echo "  Running tests..."
TEST_RESULT=$(echo '{"session_id":"install-test","prompt":"test","model":"test"}' | node "$HOOKS_DIR/aidd-log-session-start.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    SessionStart hook: OK"
else
    echo "    SessionStart hook: FAILED"
fi

TEST_RESULT=$(echo '{"session_id":"install-test","prompt":"test"}' | node "$HOOKS_DIR/aidd-log-prompt.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    UserPromptSubmit hook: OK"
else
    echo "    UserPromptSubmit hook: FAILED"
fi

TEST_RESULT=$(echo '{"session_id":"install-test","prompt":"test"}' | node "$HOOKS_DIR/aidd-log-subagent-start.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    SubagentStart hook: OK"
else
    echo "    SubagentStart hook: FAILED"
fi

TEST_RESULT=$(echo '{"session_id":"install-test","prompt":"test"}' | node "$HOOKS_DIR/aidd-log-subagent-stop.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    SubagentStop hook: OK"
else
    echo "    SubagentStop hook: FAILED"
fi

TEST_RESULT=$(echo '{"session_id":"install-test"}' | node "$HOOKS_DIR/aidd-log-stop.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    Stop hook: OK"
else
    echo "    Stop hook: FAILED"
fi

TEST_RESULT=$(echo '{"session_id":"install-test"}' | node "$HOOKS_DIR/aidd-log-session-end.js" 2>&1; echo $?)
if [ "$(echo "$TEST_RESULT" | tail -1)" = "0" ]; then
    echo "    SessionEnd hook: OK"
else
    echo "    SessionEnd hook: FAILED"
fi

echo ""
echo "========================================"
echo " Installation complete!"
echo "========================================"
echo ""
echo " Next steps:"
echo "  1. Ensure the API server is running"
echo "  2. Restart Claude Code"
echo ""
echo " Uninstall:"
echo "  bash $(dirname "$0")/uninstall-mac.sh"
echo ""
