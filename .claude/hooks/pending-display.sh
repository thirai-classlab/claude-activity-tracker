#!/usr/bin/env bash
# Stop hook: safety-net display of pending decisions to the user.
# Writes to stderr so Claude Code surfaces the message after the turn.
set -u

PENDING="${CLAUDE_PROJECT_DIR:-.}/docs/decisions/pending.md"
[[ -f "$PENDING" ]] || exit 0

ITEMS=$(awk '
  /^## 現在の判断待ち項目/ { flag=1; next }
  /^## / && flag        { flag=0 }
  flag && /^### D-/     { print }
' "$PENDING" 2>/dev/null | head -30)

[[ -z "$ITEMS" ]] && exit 0

{
  echo ""
  echo "━━━ ⏳ 判断待ち (docs/decisions/pending.md) ━━━"
  echo "$ITEMS" | sed 's/^### //'
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
} >&2
exit 0
