# Spec 006: ccusage アルゴリズムへの整合（D-014 / D-012）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [specs/](.) > **006-ccusage-alignment.md**
> **ステータス**: ✅ 承認済（D-014 B 段階導入、D-012 healthcheck 弾き、2026-04-27）

## 目的

ccusage（Claude Code usage 解析の事実上の標準 CLI）の正確な dedup・synthetic 除外・healthcheck 排除ロジックを取り込み、本プロジェクトの集計精度を業界標準に揃える。tier 按分は後続フェーズで対応（B 段階導入）。

## 取り込む 3 項目

### 1. Dedup hash 強化（D-014 B）
- **現状**: `message.id` のみで dedup
- **改修**: `${message.id}:${requestId}` の連結で hash
- **対応箇所**: `setup/hooks/shared/utils.js` `parseTranscript`、`server/src/services/transcriptParser.ts` `parseTranscriptFile`
- **fallback**: いずれかの ID が欠落 → dedup 無効（処理続行）

### 2. `<synthetic>` model 除外（D-014 B）
- ccusage は `<synthetic>` を skip
- **対応箇所**: 上記両 parser の assistant 行処理
- **挙動**: `model === '<synthetic>'` の usage は加算しない、tool_use も無視

### 3. Healthcheck session の DB 除外（D-012）
- **対応箇所**: `server/src/services/hookService.ts` `handleSessionStart` / `handleStop`
- **判定**: `data.session_uuid` が以下 prefix で始まる場合は **DB 書込み skip**:
  - `install-healthcheck-`
  - `doctor-healthcheck-`
- **互換**: 既存の `doctor-healthcheck-*` 7 件は手動削除 (D-012 適用後に SQL で）

## 実装範囲

### 編集
- `setup/hooks/shared/utils.js`: dedup hash 拡張、synthetic 除外
- `server/src/services/transcriptParser.ts`: 同等
- `server/src/services/hookService.ts`: healthcheck prefix 弾き
- 各テスト追加

### Tier 按分（D-014 後続）
本 spec の対象外。別 spec 007 で per-API-call tiered pricing を実装予定。
schema 変更が必要（`*_above_200k_tokens` 列追加）、parseTranscript の per-call cost 算出 refactor も必要。

## 受入基準

- [ ] dedup hash が `message.id:requestId` で動作
- [ ] requestId 欠落時のフォールバックも動作
- [ ] `<synthetic>` model 除外でテスト（usage 加算されない）
- [ ] `install-healthcheck-*` / `doctor-healthcheck-*` の sessionStart は DB 書込みなし
- [ ] 既存 DB の healthcheck セッションを SQL 削除
- [ ] 既存 127+ テスト全緑、tsc clean

## タスク分解

承認後 `docs/tasks/list.md` に登録:
- P6-T1: dedup hash `messageId:requestId` 化（hook 側 + server 側、テスト）
- P6-T2: `<synthetic>` model 除外（hook 側 + server 側、テスト）
- P6-T3: healthcheck prefix 弾き（hookService、テスト）+ SQL で既存削除

## 参考

- ccusage `apps/ccusage/src/data-loader.ts` `createUniqueHash` 関数
- ccusage `apps/ccusage/src/data-loader.ts` `extractUniqueModels` の synthetic フィルタ
- 観測値: 本ローカル DB に doctor-healthcheck-* が 7/13 セッション混入していた
