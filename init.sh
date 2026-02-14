#!/bin/bash
# ============================================================
# AI Driven Analytics - 初期設定スクリプト
# ============================================================
# 使い方: bash init.sh
#
# サーバー (.env) とフック配布用 (config.json) の設定ファイルを
# 対話式に生成します。既存ファイルがある場合はスキップします。
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
HOOKS_DIR="$SCRIPT_DIR/setup/hooks"
ENV_FILE="$SERVER_DIR/.env"
CONFIG_FILE="$HOOKS_DIR/config.json"

echo "========================================"
echo " AI Driven Analytics - 初期設定"
echo "========================================"
echo ""

# --- 1. server/.env ---
echo "[1/2] サーバー環境変数 (server/.env)"
echo ""

if [ -f "$ENV_FILE" ]; then
    echo "  既に存在します: $ENV_FILE"
    echo "  スキップします（上書きする場合は手動で削除してください）"
else
    # DATABASE_URL
    read -p "  DATABASE_URL [mysql://tracker:trackerpass@db:3306/claude_tracker]: " DB_URL
    DB_URL="${DB_URL:-mysql://tracker:trackerpass@db:3306/claude_tracker}"

    # PORT
    read -p "  PORT [3001]: " PORT
    PORT="${PORT:-3001}"

    # API_KEY
    GENERATED_KEY=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "  API_KEY を自動生成しました"
    read -p "  API_KEY を使用しますか? (Enter=自動生成値 / 手動入力): " CUSTOM_KEY
    if [ -n "$CUSTOM_KEY" ]; then
        API_KEY="$CUSTOM_KEY"
    else
        API_KEY="$GENERATED_KEY"
    fi

    # BASIC_AUTH_PASSWORD
    read -p "  BASIC_AUTH_PASSWORD (ダッシュボード認証、空=無効): " BASIC_AUTH_PASSWORD

    cat > "$ENV_FILE" << EOF
# Database (MariaDB)
DATABASE_URL="$DB_URL"

# API Server
PORT=$PORT
NODE_ENV=production

# API Key (Hook エンドポイントの認証)
API_KEY=$API_KEY

# Basic Auth (ダッシュボード UI の保護)
BASIC_AUTH_PASSWORD=$BASIC_AUTH_PASSWORD

# Cost rates (per 1M tokens, USD)
COST_OPUS_INPUT=15
COST_OPUS_OUTPUT=75
COST_SONNET_INPUT=3
COST_SONNET_OUTPUT=15
COST_HAIKU_INPUT=0.80
COST_HAIKU_OUTPUT=4
EOF

    echo ""
    echo "  作成しました: $ENV_FILE"
fi
echo ""

# --- 2. setup/hooks/config.json ---
echo "[2/2] フック配布用設定 (setup/hooks/config.json)"
echo ""

if [ -f "$CONFIG_FILE" ]; then
    echo "  既に存在します: $CONFIG_FILE"
    echo "  スキップします（上書きする場合は手動で削除してください）"
else
    # API URL
    read -p "  API URL (メンバーからアクセスできるサーバーURL) [http://localhost:3001]: " API_URL
    API_URL="${API_URL:-http://localhost:3001}"

    # API Key（.env から取得、または手動入力）
    if [ -n "$API_KEY" ]; then
        CONFIG_API_KEY="$API_KEY"
        echo "  API Key: (.env と同じ値を使用)"
    elif [ -f "$ENV_FILE" ]; then
        CONFIG_API_KEY=$(grep "^API_KEY=" "$ENV_FILE" | cut -d= -f2-)
        if [ -n "$CONFIG_API_KEY" ]; then
            echo "  API Key: (.env から読み込み)"
        fi
    fi

    if [ -z "$CONFIG_API_KEY" ]; then
        read -p "  API Key: " CONFIG_API_KEY
    fi

    # Debug
    read -p "  デバッグモード (y/N): " DEBUG_INPUT
    if [ "$DEBUG_INPUT" = "y" ] || [ "$DEBUG_INPUT" = "Y" ]; then
        DEBUG_FLAG="true"
    else
        DEBUG_FLAG="false"
    fi

    cat > "$CONFIG_FILE" << EOF
{
  "api_url": "$API_URL",
  "api_key": "$CONFIG_API_KEY",
  "debug": $DEBUG_FLAG
}
EOF

    echo ""
    echo "  作成しました: $CONFIG_FILE"
fi

echo ""
echo "========================================"
echo " 初期設定完了"
echo "========================================"
echo ""
echo " 次のステップ:"
echo "  1. サーバー起動:"
echo "     cd server && docker compose up -d --build"
echo ""
echo "  2. 各メンバーの PC にフックをインストール:"
echo "     cd setup && bash install-mac.sh"
echo ""
