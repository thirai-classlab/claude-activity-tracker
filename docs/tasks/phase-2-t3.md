# P2-T3: `scripts/sync-pricing.ts`（LiteLLM + Anthropic API + override 同期）

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T2 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a8e864fee30193705）

## 完了内容

### 実装
- `server/scripts/sync-pricing.ts` 新規 350 行、`runSync(deps)` で DI 可能
- `server/tests/syncPricing.test.ts` 新規 364 行、9 テストケース（helper 3 + sync behavior 6）
- `server/package.json` に `"sync-pricing": "tsx scripts/sync-pricing.ts"` 追加
- Node 22 組み込み `fetch` + `AbortController` 30s timeout、新規依存なし

### 実行結果（Docker 内）
| 指標 | before | after |
|------|------:|------:|
| DB 行数合計 | 6 | **30** |
| LiteLLM source | 0 | 27 (standard 20 + long_context_1m 7) |
| manual_override | 0 | 3 (`.env` の COST_OPUS_* 等を検知) |
| deprecated | 0 | 0 |

### 結果
- `npm test`: **68/68 pass**
- `tsc --noEmit`: clean

### 1M tier の扱い
LiteLLM JSON は別 model_id ではなく `max_input_tokens >= 1_000_000` で表現 → 同期時に合成で `{modelId}-context-1m` + tier=`long_context_1m` + 料金 2x/1.5x として別レコード化。

## 申し送り（後続タスク・新規決定項目）

1. **🔴 1M tier lookup ミス（要即対応）**: handleStop 側の model 文字列は `claude-opus-4-7`（suffix なし）。DB には `claude-opus-4-7-context-1m` が別レコードで存在するが、`getPricing('claude-opus-4-7')` では standard tier しか返らない。usage 合計が 200K 超なら `-context-1m` variant を優先 lookup するロジック追加要 → **D-008 として pending 起票**

2. **sync-pricing.ts は 350 行**（目標 250 行超過）: コメント刈りで削減可能だが可読性とのトレードオフ。判断項目 → **D-009**

3. **Docker 本番ステージに tsx 不在**: cron (P2-T9) 組込み時に `dist/scripts/sync-pricing.js` への事前コンパイル or `npm install --include=dev` 戦略を選定 → **P2-T9 で対応**

4. **Prisma OpenSSL 警告**: Docker base image 見直し（T9 周辺）

5. **DB ポート外部非公開**: 開発者が手元で `npm run sync-pricing` を試すには `docker-compose.yml` 側で `ports: ["3306:3306"]` 必要。セキュリティトレードオフ → **D-010 として pending 起票**
