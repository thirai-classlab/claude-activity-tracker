# P2-T9: 料金同期 cron 組込み

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T3 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント ab6f457c351b8e7ff）

## 完了内容

### 新規
- `server/src/services/pricingSyncScheduler.ts`: `startPricingSync({ disabled })` 起動時+定期実行、`runSync` injectable、`unref()` で event loop 固定化防止
- `server/tests/pricingSyncScheduler.test.ts`: 7 テスト（interval / initial run / error swallow / scheduled fire / disabled flag）

### 変更
- `server/src/index.ts`: `httpServer.listen` 後に `startPricingSync()` 呼出し、`projectRoot` 解決ロジック導入（`NEXT_APP_DIR` env override 対応）
- `server/tsconfig.server.json`: `rootDir: "./src"` → `"."`、include に `scripts/sync-pricing.ts` 追加
- `server/Dockerfile`: builder stage で `COPY scripts/` + CMD を `dist/src/index.js` に
- `server/.dockerignore`: `scripts/*` + `!scripts/sync-pricing.ts` で runtime 必要分のみ含める
- `server/package.json`: `start` を `dist/src/index.js` に
- `server/ecosystem.config.js`: PM2 パスを同期

### 採用アプローチ
Option B（事前コンパイル）: `tsc` で `dist/scripts/sync-pricing.js` に出力、`tsx` を本番依存に昇格しない（image size 膨張回避）。

### Live Test
```
docker run --rm -d -e PRICING_SYNC_INTERVAL_SEC=5 server-api
# [pricing-sync] initial run... → upserted=27
# [pricing-sync] scheduled every 5s.
# [pricing-sync] scheduled run... (5秒おき繰り返し)
```
デフォルト 3600s も確認済み。

### 結果
- `npm test`: **79/79 pass**
- tsc clean（Next.js / server 両方）
- Docker build 成功

## 破壊的変更

- `dist/index.js` → `dist/src/index.js`（`package.json#start`, `Dockerfile CMD`, `ecosystem.config.js` 全て同期済み）
- README / docs で古いパスを直指定している箇所があれば要更新

## 申し送り

- `.env.example` に `PRICING_SYNC_INTERVAL_SEC` / `PRICING_SYNC_DISABLED` / `NEXT_APP_DIR` を追記（本タスク範囲外、メイン側で対応）
- `docker-compose.yml` で env を子コンテナに渡すには `environment:` 追記必要（現状 `env_file: .env` のみ）
- Prisma OpenSSL 警告は機能影響なし、将来の Docker base image 見直し候補
