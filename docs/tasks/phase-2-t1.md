# P2-T1: Prisma schema `model_pricing` テーブル追加 + migration

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント aca04821624f1c33e）
> **着手条件**: Phase 1 完了（2026-04-25 達成）

## 完了内容

- `server/prisma/schema.prisma`: `ModelPricing` モデル追加（Decimal(10,4) × 4 + meta 列）
- `server/prisma/seed.ts`: 6 レコード upsert ロジック追加（L370-410）
- `server/tests/modelPricing.schema.test.ts`: 新規
- MariaDB: `model_pricing` テーブル作成済み（`prisma db push --skip-generate`）
- 初期 6 レコード投入（直接 SQL INSERT、`fallback_default` / verified=false）
  - claude-opus-4-6 / claude-opus-4-7 / claude-opus-4-7-context-1m (1M tier, 2x premium)
  - claude-sonnet-4-5-20250929 / claude-sonnet-4-6
  - claude-haiku-4-5-20251001
- 既存 16/16 + 新規テストで **35/35 pass**

## 注意

- `npm run db:seed` は既存セッションデータを `deleteMany` で削除する（seed.ts main() 内）。本番 DB で誤実行しないこと。今後は `prisma/seed-pricing.ts` に pricing 部分を切り出して非破壊実行できるようにするのが望ましい（フォローアップ候補）

## スコープ

- `server/prisma/schema.prisma` に `ModelPricing` モデル追加（設計書の「DB 設計」節通り）
- `prisma db push` or `migrate dev` で MariaDB に反映
- `server/prisma/seed.ts` に 6 件の `fallback_default` レコード投入ロジック追加
- スキーマ検証テスト追加

## 初期シード対象モデル

| model_id | family | tier | cache_read $/M |
|---------|--------|------|---|
| claude-opus-4-6 | opus | standard | 1.50 |
| claude-opus-4-7 | opus | standard | 1.50 |
| claude-opus-4-7-context-1m | opus | long_context_1m | 3.00 (2x) |
| claude-sonnet-4-5-20250929 | sonnet | standard | 0.30 |
| claude-sonnet-4-6 | sonnet | standard | 0.30 |
| claude-haiku-4-5-20251001 | haiku | standard | 0.08 |

## 受入基準

- [ ] schema.prisma に ModelPricing モデル追加、既存 8 テーブルは無変更
- [ ] MariaDB に model_pricing テーブルが作成される
- [ ] seed で 6 レコード upsert（`source='fallback_default'`, `verified=false`）
- [ ] `cd server && npm test` 緑
- [ ] `npm run test:api` 緑
- [ ] DESCRIBE model_pricing 確認

## 後続タスク

- P2-T2: `pricingRepository.ts` 実装（本テーブルへの CRUD）
- P2-T3: `sync-pricing.ts` 実装（LiteLLM JSON 取り込み）

## 委譲

`server/prisma/` `server/src/` はメイン直接編集不可。Agent 経由。
