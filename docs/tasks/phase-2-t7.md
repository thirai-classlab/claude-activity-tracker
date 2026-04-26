# P2-T7: `GET /api/dashboard/models` エンドポイント追加

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T2
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a82eba76e3b227b4c）

## 完了内容
- `server/src/routes/dashboardRoutes.ts` に `GET /models` 追加（`includeDeprecated` クエリ対応）
- `server/src/services/dashboardService.ts` に `getModels()` 公開関数追加（pricingRepository ラップ）
- `server/tests/dashboardRoutes.models.test.ts` 新規 4 テスト（shape / deprecated / 401 invalid / 401 missing）
- 並行 fix: `server/tests/syncPricing.test.ts` の TS2741 × 6 件を `as NodeJS.ProcessEnv` キャストで解消
- 結果: **72/72 pass**、tsc clean（Next.js / server 両方）

## API 応答例
```json
{ "models": [
  { "modelId":"claude-opus-4-7", "tier":"standard", "inputPerMtok":15, ... },
  { "modelId":"claude-opus-4-7-context-1m", "tier":"long_context_1m", "inputPerMtok":30, ... }
]}
```
