#!/usr/bin/env bash
# UserPromptSubmit hook: inject current pending decisions into Claude context.
# Silent (output {} JSON) when no items exist.
set -u

PENDING="${CLAUDE_PROJECT_DIR:-.}/docs/decisions/pending.md"
if [[ ! -f "$PENDING" ]]; then
  echo '{}'
  exit 0
fi

# Extract pending items from the "現在の判断待ち項目" section.
ITEMS=$(awk '
  /^## 現在の判断待ち項目/ { flag=1; next }
  /^## / && flag        { flag=0 }
  flag && /^### D-/     { print }
' "$PENDING" 2>/dev/null | head -30)

if [[ -z "$ITEMS" ]]; then
  echo '{}'
  exit 0
fi

CTX="[autonomy.md] 応答末尾で以下の判断待ち項目を必ず要約表示すること（ID / 項目 / 推奨既定のみ）。新たな判断が必要になった場合も docs/decisions/pending.md に追記し、推奨既定で作業続行すること:
$ITEMS"

jq -n --arg c "$CTX" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$c}}'
