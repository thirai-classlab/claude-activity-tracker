# P2-T11: admin UI で manual override 追加

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T2, P2-T7 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a865facd9e00bdc76）

## 完了内容

### API
- `POST /api/dashboard/models/override`: upsert（body バリデーション → `pricingRepository.upsertPricing({ ..., source: 'manual_override' })`）
- `DELETE /api/dashboard/models/override/:modelId`: manual_override 行のみ削除（litellm 行は保持）
- 認証: 既存 `apiKeyAuth` を共有

### UI
- `server/src/components/pages/tokens/ModelPricingOverrideTable.tsx` 新規
- `/tokens` ページ末尾に「料金オーバーライド」セクション追加
- 一覧テーブル（source バッジ色分け、deprecated 行は opacity 0.5）+ 追加/更新フォーム + 削除ボタン
- React Query mutation hooks（成功時 `['models']` invalidate）

### 追加ファイル
- `server/src/hooks/useApi.ts` に `useUpsertModelOverride` / `useDeleteModelOverride`
- `server/src/lib/api.ts` に `api.upsertModelOverride` / `api.deleteModelOverride` + `mutateApi()`
- `server/src/services/pricingRepository.ts` に `deleteOverride(modelId)`
- `server/src/services/dashboardService.ts` に `upsertModelOverride` / `deleteModelOverride` + validation
- `server/tests/dashboardRoutes.modelOverride.test.ts` 新規 8 テスト

### 結果
- **87/87 pass**（79 既存 + 8 新規）
- tsc clean（Next.js / server 両方）

## 申し送り
- 削除前 confirm dialog / fade-out notification は MVP 外（follow-up 候補）
- MariaDB UNIQUE 制約により `upsertModelOverride` は既存 litellm 行を manual_override に上書き。削除すれば次回 sync で litellm 値に戻る（設計通り）
