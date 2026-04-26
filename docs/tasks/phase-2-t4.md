# P2-T4: `costCalculator.ts` を DB 参照版に置換

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T2 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af617b63b0f3fb4a1）

## 完了内容

### 変更
- `server/src/services/costCalculator.ts`:
  - `DEFAULT_RATES` / `getModelFamily` / 旧 sync `getCostRates` を削除
  - `calculateCost` を `Promise<number>` に変更（pricingRepository.getPricing 経由）
  - 後方互換: `CostRates = PricingRates` 型 re-export、`getCostRates = getPricing` alias
- `server/src/services/hookService.ts`:
  - L241 (`handleSubagentStop`): `await calculateCost(...)`
  - L370 (`handleStop`): `await calculateCost(...)`
- `server/tests/costCalculator.test.ts` 新規（5 テスト）:
  - Opus standard 110.25 USD / Opus 1M tier 183.0 USD / family 不明 → sonnet fallback 22.05 USD
  - Promise<number> 返却型 / 4 decimals rounding

### 結果
- `npm test`: **68 pass / 0 fail**
- `tsc -p tsconfig.server.json --noEmit`: clean
- 既存 hookService テスト、infltation テスト、pricingRepository テスト全て緑維持

## 申し送り（P2-T5 / P2-T6）

- `dashboardService.ts` L31 `function getCostRates` と L419 使用箇所が残りの重複
- `server/src/lib/constants.ts` `COST_RATES` も同じく重複
- 両方とも `pricingRepository.getPricing` or `costCalculator.calculateCost` に切替（async になる点に注意）
- `CostRates` 型は新 field 名（`inputPerMtok` 等）。古い `input/output/cacheWrite/cacheRead` を期待する呼出し側は現状存在しない（grep 確認済み）
