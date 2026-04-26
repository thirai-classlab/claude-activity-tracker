# P2-T6: `constants.ts` の `COST_RATES` 削除 + ModelSimulationTable 暫定対応

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T4 完了（P2-T7 は後続）
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a95a3dbf0396b79c0）

## 完了内容

- `server/src/lib/constants.ts`: `COST_RATES` + ヘッダコメント削除、他の定数は維持
- `server/src/components/pages/tokens/ModelSimulationTable.tsx`: `COST_RATES` import 削除、ローカル `PRICING_FALLBACK` 定数（opus/sonnet の input/output のみ）に置換、TODO(P2-T7) コメントで `/api/dashboard/models` 切替予定明記
- `server/src/components/pages/tokens/TokensPage.tsx`: 未使用 `COST_RATES` import 削除
- 計算値は旧実装と完全一致（grep + manual verification）
- `npm test` 68/68、`tsc --noEmit` clean（Next.js / server 両方）

## 残件

- P2-T7 実装完了時に `PRICING_FALLBACK` を TanStack Query hook ベース API fetch に差し替える
