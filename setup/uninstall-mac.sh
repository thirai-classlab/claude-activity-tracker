#!/usr/bin/env bash
# ============================================================
# Claude Code Activity Tracker - macOS uninstaller (npx shim)
# ============================================================
# 旧スクリプトは setup/old/uninstall-mac.legacy.sh に保管。
# ============================================================

set -e

PACKAGE="@classlab/claude-activity-tracker-hooks"
ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --legacy)
      exec bash "$(dirname "$0")/old/uninstall-mac.legacy.sh" "${@:2}"
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if ! command -v npx >/dev/null 2>&1; then
  echo "[ERROR] npx not found." >&2
  exit 1
fi

exec npx "$PACKAGE" uninstall "${ARGS[@]}"
