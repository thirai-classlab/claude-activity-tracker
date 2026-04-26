#!/usr/bin/env bash
# PreToolUse guard.
#
# 実運用での観測結果:
#   Claude Code の PreToolUse payload には `parent_tool_use_id` が含まれない。
#   session_id / transcript_path はメインもサブも同じ値になる場合がある。
#   → hook だけで main/sub を機械的に区別するのは現状困難。
#
# 現在のポリシー（CLAUDE.md + .claude/rules/ で運用規律を担保）:
#   - 制限パス (server/src/, server/prisma/, setup/hooks/, tests/, scripts/) への
#     直接編集は **block しない**（markdown ルールで自己規制）
#   - docs/tasks/ への編集時のみ、設計ドキュメント存在チェック + リマインダ
#
# Block する条件:
#   - docs/tasks/ 編集時に docs/draft/ にも docs/specs/ にも設計 md が無い

set -u

INPUT=$(cat)

LOG="${CLAUDE_PROJECT_DIR:-/tmp}/.claude/hooks/delegation-guard.debug.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null
{
  printf '=== %s ===\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '%s\n' "$INPUT" | jq -c . 2>/dev/null || printf '%s\n' "$INPUT"
  printf '\n'
} >> "$LOG" 2>/dev/null

FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // .tool_input.path // empty')

# docs/tasks/ guidance (always-on reminder)
case "$FILE" in
  */docs/tasks/*)
    if ls "${CLAUDE_PROJECT_DIR:-.}"/docs/draft/*.md 1>/dev/null 2>&1 \
       || ls "${CLAUDE_PROJECT_DIR:-.}"/docs/specs/*.md 1>/dev/null 2>&1; then
      jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:"[タスク管理ルール] docs/tasks/ を編集中。設計(docs/draft/ or docs/specs/)→承認→タスク追加のフローを遵守。list.md と個別詳細ファイルを必ずセットで更新。"}}'
    else
      jq -n '{decision:"block",reason:"docs/tasks/ への追加には docs/draft/ または docs/specs/ に設計ドキュメントが必要です。先に設計を作成し、承認を得てください。"}'
    fi
    exit 0
    ;;
esac

# No blocking for restricted paths — rule enforcement is on the markdown layer.
echo '{}'
exit 0
