# P1.5-T5: dashboardService 集計を main/subagent 分離体系に対応

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **依存**: P1.5-T4 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a872e56b1f94557f8）

## 完了内容

### 新規 helper
`computeSessionGrandTotals(sums): SessionGrandTotals` pure 関数を export
- Prisma `_sum` payload を `{grand, main, subagent}` 3 値に変換

### 集計関数の対応（grand total = main + subagent に切替）
- getStats / getDailyStats / getMemberStats / getCostStats
- getHeatmapData / getRepoStats / getRepoDetail / getMemberDetail
- getRepoDateHeatmap / getMemberDateHeatmap / getProductivityMetrics
- getSessions / getSessionDetail

### レスポンス互換性
- 既存キー（`totalInputTokens` 等）は **grand total** を意味するように変更（互換重視）
- 新規 `mainXxx` / `subagentXxx` キーを追加（オプショナル、UI で内訳表示可能）

### テスト
`tests/dashboardService.subagentSplit.test.ts` 新規 6 テスト（D1〜D6）
結果: **124/124 pass**、tsc clean（Next.js / server 両方）

## 申し送り
- `getRepoDetail.recentSessions` の Prisma 生レコードは subagent カラムも含むため UI 側で参照可能
- 既存 fixture / E2E は upper-compatible（既存キーは grand total 値で残存）
