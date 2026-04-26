# P1.5-T1: cacheEfficiency 計算式修正（#12）

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a05112995f4ec13a2）

## 完了内容
- `dashboardService.ts`: `computeCacheEfficiency` pure 関数 export、`getStats` で利用
- 計算式: `cacheRead / (input + cacheCreation + cacheRead)` (0〜1 に必ず収まる)
- 負値クランプ追加
- `tests/dashboardService.cacheEfficiency.test.ts` 新規 7 テスト
- 結果: **100/100 pass**、tsc clean
