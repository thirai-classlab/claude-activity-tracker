# P1.5-T4: schema に `subagent_*_tokens` 分離カラム追加（#4）

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **依存**: P1.5-T3 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a9b0ffcc5fd2508e0）

## 完了内容

### Schema 変更
`server/prisma/schema.prisma` の `Session` モデルに 5 列追加:
- `subagent_input_tokens`, `subagent_output_tokens`, `subagent_cache_creation_tokens`, `subagent_cache_read_tokens`, `subagent_estimated_cost`

`prisma db push --skip-generate` で MariaDB 反映済。

### handleStop 修正
- pure helper `buildSessionTokenUpdate(...)` を追加
- 旧: `totalInputTokens = main + subagent` の合算保存
- 新: `total_*` は main only、`subagent_*` は別カラム

### テスト
- `tests/hookService.subagentTokens.test.ts` 新規 4 ケース（C1-C4）
- 結果: **118/118 pass**、tsc clean

### Smoke Check
合成セッションで `total_input_tokens=50 / subagent_input_tokens=1000` が分離保存されることを確認、idempotency も確認。

## 注意

- **dashboardService 集計が暫定的に under-display 状態** → T5 で即対応
- 既存セッションは `subagent_*` がデフォルト 0（バックフィル無し、D-001 C 案準拠）
