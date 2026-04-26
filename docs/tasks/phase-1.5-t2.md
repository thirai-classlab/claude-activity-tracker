# P1.5-T2: 最終ターン duration を transcript timestamp 優先（#7）

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a310b6bc9bdfc177b）

## 完了内容
- `hookService.ts` に `resolveResponseTime(responseCompletedAt, isLatestTurn, now)` pure helper 追加
- 旧: 最終ターンは `now` 強制 → 新: transcript timestamp 優先、無いときのみ now() フォールバック
- `tests/hookService.duration.test.ts` 新規 5 テスト（D1-D5）
- D5 で旧 35min vs 新 5min の差を実証（30 分 idle 削減）
- 結果: **105/105 pass**、tsc clean
