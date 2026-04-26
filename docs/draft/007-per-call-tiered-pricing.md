# Draft 007: per-API-call tiered pricing（D-014 後続、200K 按分）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **007-per-call-tiered-pricing.md**
> **ステータス**: 🟡 未承認（レビュー依頼中）
> **起票日**: 2026-04-27
> **関連**: D-014 段階導入の B 後続、ccusage 方式の完全実装

## 目次

- [問題](#問題)
- [ccusage の実装](#ccusage-の実装)
- [設計](#設計)
- [DB 拡張](#db-拡張)
- [Parser 改修](#parser-改修)
- [テスト設計](#テスト設計)
- [既存データの扱い](#既存データの扱い)
- [タスク分解](#タスク分解)
- [参考文献](#参考文献)

---

## 問題

D-008 修正で「session 累積 > 200K → premium」の誤動作は止まり、`[1m]` literal 判定に切替えた。しかし以下が依然として未対応:

- 1M context モード利用時、Anthropic は **per-API-call の token 量に応じて 200K を超える分のみ tiered rate** で課金（按分）
- 本プロジェクトは「modelId 全体で premium or standard」の二択しか実装していない
- LiteLLM JSON は `input_cost_per_token_above_200k_tokens` 等のフィールドを持っているが、本プロジェクトでは未取り込み

実害: 1M context モード利用時、`[1m]` model でない通常 opus でも 200K 超 input call があれば under-counting。逆に `[1m]` mode の short call（< 200K input）も誤って premium で over-counting。

## ccusage の実装

`packages/internal/src/pricing.ts` `calculateCostFromPricing`:

```ts
const calculateTieredCost = (
  totalTokens, basePrice, tieredPrice, threshold = 200_000
) => {
  if (totalTokens > threshold && tieredPrice != null) {
    const below = Math.min(totalTokens, threshold);
    const above = Math.max(0, totalTokens - threshold);
    return above * tieredPrice + below * basePrice;
  }
  return totalTokens * basePrice;
};

// per-token-type 適用
const inputCost = calculateTieredCost(input_tokens, base, tiered);
const outputCost = calculateTieredCost(output_tokens, base, tiered);
const cacheCreationCost = calculateTieredCost(cache_creation, base, tiered);
const cacheReadCost = calculateTieredCost(cache_read, base, tiered);
```

つまり `1 API call ごと` に `4 種 token x 200K 按分` を計算して合算。

## 設計

### コア API

`pricingRepository.calculateTieredCost()` を新規 export:

```ts
export interface TieredRates {
  inputBase: number;
  inputAbove200k: number | null;
  outputBase: number;
  outputAbove200k: number | null;
  cacheWriteBase: number;
  cacheWriteAbove200k: number | null;
  cacheReadBase: number;
  cacheReadAbove200k: number | null;
}

export interface PerCallUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export async function calculatePerCallCost(
  modelId: string,
  perCallUsage: PerCallUsage,
): Promise<number>;
```

`getPricing` の戻り値を拡張するか、別 `getTieredRates` を export。

### parseTranscript 改修

各 assistant message ごとに `usage` を取り出し:
- 累積 token は今まで通り集計
- **加えて per-call cost を `calculateTieredCost(modelName, usage)` で計算**
- session 全体の cost は per-call cost の合計

注: 現状はクライアント側 hook が token 累積を post し server で `calculateCost` を 1 回呼ぶ方式。これを以下のいずれかに変更:
- A. **クライアント hook 内で per-call cost 計算 → 累積 cost を post**（料金 SSOT がクライアント側に移る、運用上不便）
- B. **クライアント hook が per-call usage 配列を post → server 側で per-call cost 計算**（推奨、SSOT 維持）

B 案では `data.response_texts[]` の各要素に既に per-call usage が入っているため、server 側で逐次 `calculatePerCallCost` を呼ぶだけで完結。

## DB 拡張

`model_pricing` テーブル:

```prisma
model ModelPricing {
  // 既存
  inputPerMtok        Decimal @db.Decimal(10, 4)
  outputPerMtok       Decimal @db.Decimal(10, 4)
  cacheWritePerMtok   Decimal @db.Decimal(10, 4)
  cacheReadPerMtok    Decimal @db.Decimal(10, 4)

  // 新規（nullable、tiered 価格設定がある model のみ）
  inputAbove200kPerMtok      Decimal? @map("input_above_200k_per_mtok") @db.Decimal(10, 4)
  outputAbove200kPerMtok     Decimal? @map("output_above_200k_per_mtok") @db.Decimal(10, 4)
  cacheWriteAbove200kPerMtok Decimal? @map("cache_write_above_200k_per_mtok") @db.Decimal(10, 4)
  cacheReadAbove200kPerMtok  Decimal? @map("cache_read_above_200k_per_mtok") @db.Decimal(10, 4)
  // ...
}
```

`sync-pricing.ts` で LiteLLM の `*_cost_per_token_above_200k_tokens` を読み取り保存。

## Parser 改修

`server/src/services/hookService.ts` `handleStop`:
- 現状: `calculateCost(model, total_aggregated_usage)` 1 回
- 新: `data.response_texts[]` を loop して各 call の `calculatePerCallCost(model, perCallUsage)` を計算 → sum

副次効果: per-turn cost が正確になり、turn-level の cost 表示も追加可能（嬉しいおまけ）。

## テスト設計

### Tiered cost helper（unit）

| # | usage | 期待結果 |
|---|-------|--------|
| TC1 | `input=100K, output=50K`（200K 以下）+ tiered なし | `100K * base + 50K * base` |
| TC2 | `input=300K`（200K 超）+ base=$5, tiered=$10 | `200K*5 + 100K*10 = 2.0`（per M token） |
| TC3 | `cache_read=500K` + base=$0.5, tiered=$1.0 | `200K*0.5 + 300K*1.0 = 0.4` |
| TC4 | tiered フィールド null + 量 > 200K | base のみで計算（fallback） |
| TC5 | 各 token type 独立判定（input only > 200K の時 cache_read は base） |

### Per-call cost integration

| # | response_texts 配列 | 期待 |
|---|--------------------|------|
| IC1 | 全 call < 200K | session cost = sum(call cost) = base 単価で全部 |
| IC2 | 1 call > 200K + 残り < 200K | その 1 call だけ tiered 適用、他は base |
| IC3 | 全 call > 200K | 全 call tiered 適用 |

### 既存セッション再計算

- `recalc-costs.ts` を拡張して per-call mode で再計算
- 既存 8 sessions (1M context 利用なし想定) は cost 不変であることを確認

## 既存データの扱い

D-008 修正後の現 DB sessions の cost は:
- 通常 opus セッション: base 単価で正しい（変動なし）
- `[1m]` literal model: 全 call premium（多くの場合過剰、本来は call 単位で按分すべき）

新仕様で再計算後:
- 通常 opus: 不変
- `[1m]`: per-call の入力サイズで按分 → 適切な cost

## タスク分解

承認後 `docs/tasks/list.md` に Phase 7 として登録予定:

- P7-T1: schema に `*_above_200k_per_mtok` 4 列追加 + migration
- P7-T2: `sync-pricing.ts` で LiteLLM tiered fields を読み取り upsert
- P7-T3: `pricingRepository.calculatePerCallCost()` 新規 + tiered helper
- P7-T4: `hookService.handleStop` の cost 算出を per-call ベースに refactor
- P7-T5: テスト TC1〜TC5、IC1〜IC3 追加
- P7-T6: `recalc-costs.ts` を per-call mode に拡張、既存全 session 再計算
- P7-T7: 受入後、resolved.md に D-014 A 完全実装を記録

## 参考文献

- [LiteLLM `model_prices_and_context_window.json`](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json) — `*_cost_per_token_above_200k_tokens` フィールド
- [ccusage `packages/internal/src/pricing.ts`](https://github.com/ryoppippi/ccusage/blob/main/packages/internal/src/pricing.ts) — `calculateTieredCost` の参考実装
- [Anthropic Long Context Pricing](https://docs.anthropic.com/en/docs/about-claude/models/overview) — 200K 閾値の公式仕様
