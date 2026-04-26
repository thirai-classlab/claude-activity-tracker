# P2-T2: `pricingRepository.ts` 実装 + テスト

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T1（schema + seed）完了後
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント aa65f910b982febe3）

## 完了内容

- `server/src/services/pricingRepository.ts` 新規（約 320 行）: `getPricing` / `getAllModels` / `upsertPricing` / `markDeprecated` / `setVerified` + テスト用 DI hook
- `server/tests/pricingRepository.test.ts` 新規、12 テスト（P1-P6 + smoke + Decimal 変換）
- 結果: **54/54 pass** / tsc clean / 既存 42 テスト緑維持
- Decimal→number: `toNumber()` → `parseFloat(String())` フォールバック。呼び出し側は number のみ

## 申し送り（P2-T4 以降）

1. `getPricing()` は常に成功（hardcode fallback があり null を返さない）
2. tier 判定は model_id サフィックス（`-context-1m` など）で自然に分岐
3. `HARDCODE_BY_FAMILY` は `costCalculator.ts` の `DEFAULT_RATES` と**完全一致**させた → 移行時挙動差異なし
4. `source='manual_override'` レコードは deprecated に関係なく最優先
5. `getAllModels({ includeDeprecated: false })` が既定

## スコープ

DB `model_pricing` テーブルへの CRUD を提供する repository レイヤー新規実装。`costCalculator.ts` と `dashboardService.ts` から参照される唯一のエントリポイント。

## 変更対象

- `/Users/t.hirai/develop/claude-activity-tracker/server/src/services/pricingRepository.ts`（新規、約 120 行想定）
- `/Users/t.hirai/develop/claude-activity-tracker/server/tests/pricingRepository.test.ts`（新規）

## API 仕様

```ts
export interface PricingRates {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
}

export interface ModelPricingRecord extends PricingRates {
  modelId: string;
  family: 'opus' | 'sonnet' | 'haiku' | string;
  tier: 'standard' | 'long_context_1m' | 'latency_optimized' | string;
  contextWindow: number | null;
  maxOutput: number | null;
  source: string;
  verified: boolean;
  deprecated: boolean;
}

// ── 公開 API ──

export async function getPricing(modelId: string): Promise<PricingRates>;
// fallback chain:
//   1. model_id 完全一致 (deprecated=false)
//   2. 同 family の standard tier
//   3. hardcode sonnet 既定値（壊滅時の保険）

export async function getAllModels(options?: { includeDeprecated?: boolean }): Promise<ModelPricingRecord[]>;

export async function upsertPricing(record: Partial<ModelPricingRecord> & { modelId: string }): Promise<void>;

export async function markDeprecated(modelId: string): Promise<void>;

export async function setVerified(modelId: string, verified: boolean): Promise<void>;
```

## テストケース（spec 002 P1〜P6）

| # | ケース | 期待 |
|---|--------|------|
| P1 | DB に model_id 完全一致 + deprecated=false | DB 値を返す |
| P2 | 完全一致なし、family=opus の standard tier あり | family fallback 値 |
| P3 | family も一致なし | hardcode sonnet 既定 |
| P4 | deprecated=true のみ一致 | 同じく fallback へ（警告ログ） |
| P5 | source='manual_override' あり | 常に優先採用 |
| P6 | model_id 末尾 `-context-1m` | premium 料金が返る |

## 受入基準

- [ ] 上記 6 テスト全緑
- [ ] TypeScript 型チェック緑
- [ ] Decimal→number 変換を repository 内で完結（呼び出し側は number のみ）
- [ ] 既存テスト全緑

## 委譲

`server/src/services/` はメイン編集不可。Agent 経由。
