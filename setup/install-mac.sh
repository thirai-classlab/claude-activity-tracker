#!/usr/bin/env bash
# ============================================================
# Claude Code Activity Tracker - macOS installer (npx shim)
# ============================================================
# 旧スクリプトは setup/old/install-mac.legacy.sh に保管。
# npm publish 後は npx 経由が SSOT。
# ============================================================

set -e

PACKAGE="@classlab/claude-activity-tracker-hooks"
ARGS=()

# Pass through all flags to npx invocation
while [[ $# -gt 0 ]]; do
  case "$1" in
    --legacy)
      echo "▷ Using legacy installer (setup/old/install-mac.legacy.sh)"
      exec bash "$(dirname "$0")/old/install-mac.legacy.sh" "${@:2}"
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if ! command -v npx >/dev/null 2>&1; then
  echo "[ERROR] npx not found. Node.js 18+ required." >&2
  echo "        https://nodejs.org/ からインストール、または Homebrew: brew install node" >&2
  exit 1
fi

echo "▷ Running: npx $PACKAGE install ${ARGS[*]}"
echo "  (旧手動セットアップが必要な場合は --legacy フラグを使用)"
echo ""

exec npx "$PACKAGE" install "${ARGS[@]}"
