#!/bin/bash
# ============================================================
# Claude Code Activity Tracker - macOS セットアップスクリプト
# ============================================================
# 使い方: bash install-mac.sh
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

# --- 1. 前提条件チェック ---
echo "[1/6] 前提条件をチェック中..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js がインストールされていません"
    echo "  brew install node でインストールしてください"
    exit 1
fi

NODE_VER=$(node -v)
echo "  Node.js: $NODE_VER"

if ! command -v git &> /dev/null; then
    echo "WARNING: git が見つかりません（git情報の取得ができません）"
fi

echo "  OK"
echo ""

# --- 2. API接続設定 ---
echo "[2/6] API接続設定..."

# 既存の config.json から設定を読み込む
EXISTING_API_URL=""
EXISTING_API_KEY=""
EXISTING_DEBUG=""
CONFIG_FILE="$HOOKS_DIR/config.json"
if [ -f "$CONFIG_FILE" ]; then
    EXISTING_API_URL=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).api_url||'')}catch{}" 2>/dev/null)
    EXISTING_API_KEY=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).api_key||'')}catch{}" 2>/dev/null)
    EXISTING_DEBUG=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).debug===true?'true':'false')}catch{}" 2>/dev/null)
fi

# デフォルト config.json（配布元）から読み込み
DEFAULT_SRC_URL=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$HOOKS_SRC/config.json','utf8')).api_url||'')}catch{}" 2>/dev/null)
DEFAULT_SRC_KEY=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$HOOKS_SRC/config.json','utf8')).api_key||'')}catch{}" 2>/dev/null)

# API URL（既存 → デフォルト → localhost の優先順位）
DEFAULT_URL="${EXISTING_API_URL:-${DEFAULT_SRC_URL:-http://localhost:3001}}"
read -p "  API URL [$DEFAULT_URL]: " API_URL
API_URL="${API_URL:-$DEFAULT_URL}"

# API Key（既存またはデフォルトがある場合はスキップ）
if [ -n "$EXISTING_API_KEY" ]; then
    API_KEY="$EXISTING_API_KEY"
    echo "  API Key: (既存の設定を使用)"
elif [ -n "$DEFAULT_SRC_KEY" ]; then
    API_KEY="$DEFAULT_SRC_KEY"
    echo "  API Key: (デフォルト設定を使用)"
else
    echo "  API Key（管理者から共有されたキーを入力してください）"
    read -p "  API Key: " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "  WARNING: API Key が未入力です。サーバー側で認証が有効な場合、データ送信が拒否されます。"
    fi
fi

# デバッグモード
DEFAULT_DEBUG="${EXISTING_DEBUG:-false}"
if [ "$DEFAULT_DEBUG" = "true" ]; then
    DEBUG_DEFAULT="Y"
else
    DEBUG_DEFAULT="N"
fi
read -p "  デバッグモード (y/N) [$DEBUG_DEFAULT]: " DEBUG_MODE
if [ -z "$DEBUG_MODE" ]; then
    DEBUG_FLAG="$DEFAULT_DEBUG"
elif [ "$DEBUG_MODE" = "y" ] || [ "$DEBUG_MODE" = "Y" ]; then
    DEBUG_FLAG="true"
else
    DEBUG_FLAG="false"
fi

echo ""
echo "  設定内容:"
echo "    API URL:  $API_URL"
if [ -n "$API_KEY" ]; then echo "    API Key:  (設定済み)"; else echo "    API Key:  (未設定)"; fi
echo "    Debug:    $DEBUG_FLAG"
echo ""

# --- 3. ディレクトリ作成 & フックファイルコピー ---
echo "[3/6] フックファイルをインストール中..."

mkdir -p "$HOOKS_DIR"
mkdir -p "$HOOKS_DIR/shared"

# フックファイルをコピー（6ファイル）
for FILE in aidd-log-session-start.js aidd-log-prompt.js aidd-log-subagent-start.js aidd-log-subagent-stop.js aidd-log-stop.js aidd-log-session-end.js; do
    if [ -f "$HOOKS_SRC/$FILE" ]; then
        cp "$HOOKS_SRC/$FILE" "$HOOKS_DIR/$FILE"
        echo "  コピー: $FILE"
    else
        echo "  ERROR: $HOOKS_SRC/$FILE が見つかりません"
        exit 1
    fi
done

# 共有モジュールをコピー
if [ -f "$HOOKS_SRC/shared/utils.js" ]; then
    cp "$HOOKS_SRC/shared/utils.js" "$HOOKS_DIR/shared/utils.js"
    echo "  コピー: shared/utils.js"
else
    echo "  ERROR: $HOOKS_SRC/shared/utils.js が見つかりません"
    exit 1
fi

# package.json をコピー
if [ -f "$HOOKS_SRC/package.json" ]; then
    cp "$HOOKS_SRC/package.json" "$HOOKS_DIR/package.json"
    echo "  コピー: package.json"
else
    echo "  ERROR: $HOOKS_SRC/package.json が見つかりません"
    exit 1
fi

# config.json を作成/更新（新フォーマット）
cat > "$HOOKS_DIR/config.json" << EOF
{
  "api_url": "$API_URL",
  "api_key": "$API_KEY",
  "debug": $DEBUG_FLAG
}
EOF
echo "  作成: config.json"
echo ""

# --- 4. npm 依存パッケージ（classic-level）プリインストール ---
echo "[4/6] npm パッケージをプリインストール中..."

LEVELDB_DIR="$(node -e "console.log(require('os').tmpdir())")/claude-hook-leveldb"
if [ ! -d "$LEVELDB_DIR/node_modules/classic-level" ]; then
    mkdir -p "$LEVELDB_DIR"
    (cd "$LEVELDB_DIR" && npm install --silent classic-level 2>&1) || echo "  WARNING: classic-level のインストールに失敗しました（Claudeアカウントのメール取得に影響します）"
    echo "  インストール完了: classic-level"
else
    echo "  既にインストール済み: classic-level"
fi
echo ""

# --- 5. グローバル settings.json を更新 ---
echo "[5/6] Claude Code グローバル設定を更新中..."

HOOKS_ABS_PATH="$HOOKS_DIR"

# Node.js でJSON更新（jqが無い環境にも対応）
# 既存のフック設定を保持しつつ、Tracker用フックをマージする
node -e "
const fs = require('fs');
const settingsPath = '$SETTINGS_FILE';
const hooksDir = '$HOOKS_ABS_PATH';

let settings = {};
if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
}

if (!settings.hooks) settings.hooks = {};

// Tracker が管理するフック定義
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

    // 既存のトラッカーフックを除去（再インストール対応）
    for (const group of settings.hooks[event]) {
        if (group.hooks) {
            group.hooks = group.hooks.filter(h => !h.command || !h.command.includes('/hooks/aidd-log-'));
        }
    }
    // 空になったグループを削除
    settings.hooks[event] = settings.hooks[event].filter(g => g.hooks && g.hooks.length > 0);

    // トラッカーフックを追加
    settings.hooks[event].push({
        matcher: '',
        hooks: [{ type: 'command', command: def.command, timeout: def.timeout }]
    });
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
console.log('  更新完了: ' + settingsPath);
"
echo ""

# --- 6. 確認 & ヘルスチェック ---
echo "[6/6] インストール確認..."
echo ""
echo "  フックファイル:"
ls -la "$HOOKS_DIR"/*.js "$HOOKS_DIR"/shared/*.js "$HOOKS_DIR"/config.json "$HOOKS_DIR"/package.json 2>/dev/null | awk '{print "    " $NF}'
echo ""
echo "  設定ファイル:"
echo "    $SETTINGS_FILE"
echo ""

# APIサーバーヘルスチェック
echo "  APIサーバーヘルスチェック..."
HEALTH_RESPONSE=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null) || true
if [ -n "$HEALTH_RESPONSE" ]; then
    echo "    $API_URL/health -> OK"
    echo "    レスポンス: $HEALTH_RESPONSE"
else
    echo "    $API_URL/health -> 接続できません"
    echo "    WARNING: APIサーバーが起動していない可能性があります"
    echo "    サーバーを起動してから Claude Code を使用してください"
fi
echo ""

# テスト実行
echo "  動作テスト..."
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
echo " インストール完了!"
echo "========================================"
echo ""
echo " 次のステップ:"
echo "  1. APIサーバーが起動していることを確認してください"
echo "  2. Claude Code を再起動してください"
echo ""
echo " アンインストール:"
echo "  bash $(dirname "$0")/uninstall-mac.sh"
echo ""
