# P2-T8: `ModelSimulationTable.tsx` API fetch 化

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T7 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af36e34b6a8e8bc27）

## 完了内容

- `server/src/lib/types.ts`: `ModelInfo` / `ModelsResponse` 型追加
- `server/src/lib/api.ts`: `api.getModels(includeDeprecated?)` 追加
- `server/src/hooks/useApi.ts`: `useModels(includeDeprecated = false)` hook 追加、`staleTime: 60 * 60 * 1000`
- `server/src/components/pages/tokens/ModelSimulationTable.tsx` 改修:
  - `TODO(P2-T7)` コメント削除
  - `useModels` で `/api/dashboard/models` fetch
  - family 優先順: `claude-opus-4-7` / `claude-sonnet-4-6` → family standard → PRICING_FALLBACK
  - loading ヒント + error 警告バナー
  - `PRICING_FALLBACK` はフォールバック専用に残置

### 結果
- `npm test`: **79/79 pass**（全テスト緑）
- tsc clean（本タスク範囲）

## 申し送り
- 並行 P2-T9 の `pricingSyncScheduler` 関連 TS2307 エラーは本タスク範囲外
- `ModelInfo` と `ModelPricingRecord` が二重宣言。将来 shared types 抽出検討
