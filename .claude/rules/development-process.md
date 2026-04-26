---
paths:
  - "server/src/**/*"
  - "server/prisma/**/*"
  - "setup/hooks/**/*"
  - "scripts/**/*"
  - "tests/**/*"
---

# 開発プロセスルール

## TDD（テスト駆動開発）

すべての実装はTDDで進める。

1. テスト専門エージェント（`/sc:test`）にテスト観点・テストパターンを洗い出させる
2. テストを設計・実装する（Red: テストが失敗する状態）
3. プロダクションコードを実装してテストを通す（Green）
4. リファクタリング（Refactor）

テストなしでプロダクションコードを書かない。

## サブエージェント委譲（markdown ルールで自己規制）

メインエージェントは `server/src/` `server/prisma/` `setup/hooks/` `tests/` `scripts/` に対する直接操作を**原則禁止**する。

**現在の実装**:
- `.claude/hooks/delegation-guard.sh` は Claude Code の PreToolUse payload に main/sub を区別できる field が無いため、**制限パスブロックは行わない**（デバッグログのみ）
- 例外として `docs/tasks/` 編集時は設計 md 存在チェック + リマインダのみ
- よって**ルール遵守は markdown ルールの自己規制**に依存する
- 副次ガードとして `delegation-guard.debug.log` に全 tool 呼び出しの payload を記録し、後から監査可能

**メインエージェントが直接編集・読取すべきでないパス**（markdown ポリシー）:
- `server/src/**`, `server/prisma/**`, `setup/hooks/**`, `tests/**`, `scripts/**`
- 上記対象は `Agent` tool でサブエージェントに委譲

**メインエージェントの役割（これだけ）:**
- **タスク管理（メイン専任・必須）**: docs/tasks/ の更新、進捗追跡、ステータス変更。サブエージェントにタスク管理を委譲してはならない
- 作業のアサイン（Agent tool でサブエージェントを起動）
- 完了報告・成果物の確認
- docs/, CLAUDE.md, .claude/ など管理ファイルの更新

**メインエージェントが直接使えるツール:**
- `Skill` — 全対象（メインで直接実行可能）
- `mcp__*` — 全対象（メインで直接実行可能）
- docs/, CLAUDE.md, .claude/ の Read/Edit/Write

**サブエージェントに委譲する作業（すべて Agent tool 経由）:**
- コード調査・読み取り → `Agent(subagent_type=Explore)`
- テスト設計 → Agent 内で `/sc:test`
- コード実装 → `Agent(general-purpose)` or `Agent(isolation=worktree)`
- ビルド確認 → Agent 内で `/sc:build`
- Web 調査 → Agent 内で WebSearch/WebFetch
- プログラム実行（Bash） → Agent 内で実行
- 独立したタスクは並列で複数サブエージェントを同時起動すること

**Hook で強制ブロックされるツール（メイン直接使用禁止）:**
- `Edit` / `Write` — server/src/ server/prisma/ setup/hooks/ tests/ scripts/ 対象
- `Read` / `Grep` / `Glob` — server/src/ server/prisma/ setup/hooks/ tests/ scripts/ 対象
- `WebSearch` / `WebFetch` — 全対象
- `Bash` — 全対象（プログラム実行不可）

## 指摘対応

指摘やエラーを受けた場合は必ず:

1. 根本原因を特定する
2. 修正する
3. 再発防止策を考える
4. `.claude/rules/` へのルール追加を提案する
