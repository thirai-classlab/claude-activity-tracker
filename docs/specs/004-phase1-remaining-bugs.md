# Draft 004: Phase 1 残バグ修正（#2 / #4 / #7 / #12）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **004-phase1-remaining-bugs.md**
> **ステータス**: 🟡 未承認（レビュー依頼中）
> **起票日**: 2026-04-25
> **関連バグ**: #2 (ターンマッチ失敗), #4 (session.total_* に subagent 混入), #7 (最終ターン duration idle 込み), #12 (cacheEfficiency 計算式誤り)

## 目次

- [背景](#背景)
- [バグ #2: ターンマッチ失敗](#バグ-2-ターンマッチ失敗)
- [バグ #4: session.total_* に subagent 混入](#バグ-4-sessiontotal_-に-subagent-混入)
- [バグ #7: 最終ターン duration idle 込み](#バグ-7-最終ターン-duration-idle-込み)
- [バグ #12: cacheEfficiency 計算式誤り](#バグ-12-cacheefficiency-計算式誤り)
- [実装順序](#実装順序)
- [テスト設計](#テスト設計)
- [タスク分解](#タスク分解)
- [参考文献](#参考文献)

---

## 背景

Phase 1 の dedup 修正（spec 001）で集計の最大膨張問題は解消したが、**二次的な数値歪みが 4 件残っている**:

- **#2**: `turns.input_tokens / output_tokens / cache_* / response_text` が 28 セッション中 26 で 0/NULL → Prompt Feed が空洞
- **#4**: `session.total_input_tokens` 等に subagent 分が加算済みで、UI が別途 subagent 合計を表示すると二重計上
- **#7**: 最終ターンの `duration_ms` が hook 発火時刻と `promptSubmittedAt` の差 → ユーザーの idle 時間込みで膨張
- **#12**: `cacheEfficiency` が 100% を超える（分母の取り方が不正）

いずれも Phase 1 の dedup 修正では対象外だったため別 spec で対応する。

---

## バグ #2: ターンマッチ失敗

### 現状

`server/src/services/hookService.ts` `handleStop` L390-424 で transcript の `response_texts[].promptText` と DB の `turns.promptText` を正規化キー一致で突合している。このマッチが失敗し `turnIndexToDbId` が空 → ターン単位トークン / duration / response_text が未反映。

**計測**: 28 セッション中 26 で `turns.input_tokens = 0`、Prompt Feed が全 prompt で 0 トークン表示。

### 原因（推定）

- プロンプト先頭が slash command（`/sc:*`）や長い system-reminder を含む場合、`prompt hook` 側の truncation と parser 側の extraction でズレる
- resume / compact 後の session で turns 行数 vs transcript の user entry 数が一致しない
- `normalizePromptKey` が `...` を除去するが、`substring(0, 150)` だけでは非一意

### 解決方針

**2 段マッチ戦略**:

```
for rt in data.response_texts (順序どおり):
  1. キーベースマッチ: normalizePromptKey(rt.promptText) == normalizePromptKey(db.promptText)
     → ヒットしたら採用、unmatchedDbTurns から除去
  2. 失敗時 → ポジショナル fallback:
     unmatchedDbTurns の先頭（最古の未マッチ）を採用
```

これにより promptText が空 / 壊れていても turn 順序で必ず紐付く。transcripts に compaction が入っていて実 turns より response_texts が多い場合は余剰を破棄。

### 変更対象

- `server/src/services/hookService.ts` `handleStop` L405-424
- 対応テスト: `server/tests/hookService.turnMatch.test.ts` 新規

### 受入基準

- [ ] 既存 key-based マッチで緑のケースは引き続き緑
- [ ] key マッチ失敗のケースでも turnIndex → DB turn が 1:1 で埋まる
- [ ] resume / compaction 発生 session の fixture で検証
- [ ] 既存 session 28 (3 turns) が `npm run test:api` で正しく埋まる

---

## バグ #4: session.total_* に subagent 混入

### 現状

`hookService.ts:375-379`:

```ts
totalInputTokens: (data.total_input_tokens || 0) + (subAgg._sum.inputTokens ?? 0),
totalOutputTokens: ...,
// ...
estimatedCost: cost + (subAgg._sum.estimatedCost ?? 0),
```

`session.total_input_tokens` に subagent 分が合算されている。ダッシュボードでは `getSubagentStats` が subagent 合計を別表示 → UI で「session の合計トークン」+「subagent の合計トークン」と並ぶと二重計上される。

### 解決方針

**カラム分離**:

```prisma
model Session {
  // 既存
  totalInputTokens            Int @default(0) @map("total_input_tokens")        // main agent のみ
  totalOutputTokens           ...
  totalCacheCreationTokens    ...
  totalCacheReadTokens        ...
  estimatedCost               Float?

  // 新規
  subagentInputTokens         Int @default(0) @map("subagent_input_tokens")
  subagentOutputTokens        Int @default(0) @map("subagent_output_tokens")
  subagentCacheCreationTokens Int @default(0) @map("subagent_cache_creation_tokens")
  subagentCacheReadTokens     Int @default(0) @map("subagent_cache_read_tokens")
  subagentEstimatedCost       Float? @map("subagent_estimated_cost") @db.Double
}
```

UI は「合計」「うち main」「うち subagent」を明示表示。backward compat のため `total_*` は main のみに保持（dashboard 集計の既存クエリは再検証）。

### 影響範囲

- `hookService.ts:375-379` の保存ロジック変更
- `dashboardService.ts` の集計関数（`getStats`, `getDailyStats`, `getMemberStats` 等）で合計の意味を明示
- 既存データのバックフィル: 不要（D-001 C 案、cutoff バナーで運用）

### 受入基準

- [ ] schema.prisma 更新 + migration
- [ ] `handleStop` が main / subagent を別カラムに保存
- [ ] dashboard API で「session_total」「subagent_total」「grand_total」が個別取得可能
- [ ] UI 側は新カラム利用（次 Phase で UI 変更）、当面は合算値も表示可能

---

## バグ #7: 最終ターン duration idle 込み

### 現状

`hookService.ts:510`:

```ts
const isLatestTurn = (i === data.response_texts.length - 1);
const responseTime = isLatestTurn ? now : (rt.responseCompletedAt ? new Date(rt.responseCompletedAt) : null);
```

最終ターンだけ `new Date()`（hook 発火時刻）を使っているため、ユーザーが応答後 idle した時間が duration に加算される。

### 解決方針

transcript の最終 assistant message の `timestamp` を `responseCompletedAt` として使う。`parseTranscript` は既に `curTurnLastAssistantTimestamp` を保持している（shared/utils.js, transcriptParser.ts 両方）ので、最終ターンも transcript timestamp を優先する:

```ts
const responseTime = rt.responseCompletedAt
  ? new Date(rt.responseCompletedAt)
  : (isLatestTurn ? now : null);
```

transcript timestamp がない場合のみ `now` フォールバック。

### 受入基準

- [ ] 最終ターンの duration が transcript の最終 assistant timestamp から算出
- [ ] idle 1 時間以上のサンプルで duration が大幅縮小することを確認
- [ ] 既存テスト `npm run test:api` 緑

---

## バグ #12: cacheEfficiency 計算式誤り

### 現状

`dashboardService.ts:162-164`:

```ts
const cacheEfficiency = totalInputTokens > 0
  ? totalCacheReadTokens / totalInputTokens
  : 0;
```

`totalInputTokens`（非キャッシュ入力）を分母にしているため、キャッシュヒット率として**100% 超過が頻発**。UI では `Math.round(cacheEfficiency * 10000) / 10000` で丸めて表示しているので実質無意味。

### 解決方針

キャッシュ活用率の正しい定義:

```
cacheEfficiency = cache_read / (cache_read + input)
```

cache_read が含まれる「総読み取り」に対する cache_read の割合。0〜1 に収まり、高いほど効率的。

または業界標準の「cache hit ratio」:

```
cache_hit_ratio = cache_read / (cache_read + cache_creation + input)
```

こちらは通信量ベースで、total input-side tokens のうち何割が cached で済んだか。

**推奨**: 後者（cache_hit_ratio）を採用。分母: `input + cache_creation + cache_read`、分子: `cache_read`。

### 変更対象

- `server/src/services/dashboardService.ts` `getStats` の `cacheEfficiency` 計算
- フロント KPI 表示ラベルも「キャッシュ効率」→「キャッシュヒット率」に変更

### 受入基準

- [ ] 新計算式が 0〜1 に収まる（100% 超なし）
- [ ] 既存テスト緑
- [ ] UI 表示も対応

---

## 実装順序

| 順 | バグ | 推奨タスク ID | 依存 |
|---|------|------------|------|
| 1 | #12 | P1.5-T1 | なし（軽微修正） |
| 2 | #7 | P1.5-T2 | なし |
| 3 | #2 | P1.5-T3 | なし |
| 4 | #4 | P1.5-T4 | schema 変更あり、migration 要 |

#12 と #7 は小修正で即採用可。#2 は既存 E2E 影響大、慎重に。#4 は schema migration で最後に投入。

---

## テスト設計

### 単体テスト

- `hookService.turnMatch.test.ts`: #2 の 2 段マッチ（key / fallback の両方）
- `hookService.duration.test.ts`: #7 で transcript timestamp 優先
- `hookService.subagentTokens.test.ts`: #4 で main/subagent カラム分離
- `dashboardService.cacheEfficiency.test.ts`: #12 で 0〜1 に収まる

### 統合テスト

- 既存 `scripts/test-api.ts` に以下追加:
  - stop hook → session.turnCount 正常 + session.total_* は main のみ
  - stop hook → subagent.* カラム経由で subagent 分が別取得可能
  - GET /stats → cacheEfficiency ≤ 1.0

### 回帰

- 既存 26/26 を維持
- fixture inflation test（P1-T4）が緑継続

---

## タスク分解

承認後 `docs/tasks/list.md` に Phase 1.5 として登録予定:

- P1.5-T1: `dashboardService.ts` の cacheEfficiency 計算式修正（#12）
- P1.5-T2: `hookService.ts` 最終ターン duration を transcript timestamp 優先に（#7）
- P1.5-T3: `hookService.ts` turnIndex → turnId マッチにポジショナル fallback 追加（#2）
- P1.5-T4: schema + hookService に `subagent_*_tokens` / `subagent_estimated_cost` 分離カラム追加（#4）
- P1.5-T5: ダッシュボード集計関数を新カラム体系に対応
- P1.5-T6: フロント KPI 表示を「キャッシュヒット率」ラベルに
- P1.5-T7: 各バグ単体テスト + 統合テスト追加

## 参考文献

- 初回調査レポート: 2026-04-25 ターンの会話履歴（バグ #1〜#15 全体像）
- Prisma schema: `server/prisma/schema.prisma` の `Session` モデル
- Anthropic キャッシュ課金: [Prompt caching docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
