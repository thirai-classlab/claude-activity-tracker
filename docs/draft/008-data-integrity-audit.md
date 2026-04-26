# Draft 008: データ整合性監査の検出事項一括対応

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **008-data-integrity-audit.md**
> **ステータス**: 🟡 未承認
> **起票日**: 2026-04-27
> **背景**: 包括的監査で多数の不備を発見

## 目次

- [監査結果サマリ](#監査結果サマリ)
- [Bug B: turn matching time-travel](#bug-b-turn-matching-time-travel)
- [Bug C: tool_uses.executed_at 全件 NULL](#bug-c-tool_usesexecuted_at-全件-null)
- [Bug D / E: tool_use / file_change のリンク欠損](#bug-d--e-tool_use--file_change-のリンク欠損)
- [Bug F / G / H / I: turn duration / response 関連](#bug-f--g--h--i-turn-duration--response-関連)
- [Bug J / K / L: subagent 軽微](#bug-j--k--l-subagent-軽微)
- [タスク分解](#タスク分解)
- [既存データの扱い](#既存データの扱い)

---

## 監査結果サマリ

| 重要度 | バグ | 観測値 |
|-------|------|-------|
| 🔴 (解決済) | A: 旧コンテナ未反映で D-008 リグレッション | $859 → $516 補正 |
| 🔴 | B: turn matching の時系列逆転 | 5+ ターンで response < prompt（最大 26h 差） |
| 🔴 | C: tool_uses.executed_at 全件 NULL | 2886/2886 (100%) |
| 🟠 | D: tool_uses.turn_id NULL | 1000/2886 (35%) |
| 🟠 | E: file_changes リンク欠損 | turn_id NULL 246/617、tool_use_id NULL 371/617 |
| 🟠 | F: turns.duration_ms 全件 NULL | 100/100 (100%) |
| 🟠 | G: turns.response_text NULL | 43/100 (43%) |
| 🟠 | H: turns.input_tokens=0 | 40/100 (40%) |
| 🟠 | I: sessions.duration_ms NULL | 9/10 (90%) |
| 🟡 | J/K/L: subagent 軽微 | 各 1-2 件 |

## Bug B: turn matching time-travel

### 再現

```
session 10 turn 19: prompt at 18:13 (今日) / response at 15:45 (昨日) → diff -26h
session 19 turn 4: prompt at 18:20 / response at 18:17 → diff -3min
```

### 仮説

`buildTurnIndexMap` の動作:
1. `dbTurns` を `turnNumber asc` で並べる
2. 各 `response_text` について key 一致を試行
3. 失敗時 → unmatchedDbTurns の先頭（最古）を採用

問題: stop hook が**複数回発火**したとき、過去の transcript の response_texts と現在の DB turns の対応がズレる。具体的には:
- 過去の stop fire で turn 1, 2 に response_completed_at 設定済
- ユーザが新たに turn 3, 4 を作成（promptText だけ）
- 次の stop fire 時、parser は 4 つの response_texts を生成（後ろ 2 つは null timestamp or 古い値）
- buildTurnIndexMap が positional fallback で順序を間違える

### 解決方針

1. `buildTurnIndexMap` のテストに **chronological constraint** を追加: matched (rt[i] → turnX) で `turnX.promptSubmittedAt <= rt[i].responseCompletedAt` を要求。違反したら fallback も試さず skip
2. stop hook での turn 更新を **chronological constraint check** で wrap: `responseCompletedAt < promptSubmittedAt` なら更新スキップ
3. 既存の不整合データ修正: SQL で `WHERE response_completed_at < prompt_submitted_at` を NULL に戻す

## Bug C: tool_uses.executed_at 全件 NULL

### 原因

`hookService.ts` `handleStop` で `tool_uses` を createMany するとき、 `executedAt` を渡していない。クライアント側 hook (`shared/utils.js`) も `executedAt` を payload に含めていない。

### 解決方針

1. `parseTranscript` で各 `tool_use` block 検出時に親 assistant entry の `obj.timestamp` を `executedAt` として保持
2. `aidd-log-stop.js` payload の `tool_uses[].executed_at` に追加
3. `hookService.handleStop` で `data.tool_uses[].executed_at` を `executedAt` として保存

## Bug D / E: tool_use / file_change のリンク欠損

### 原因

- subagent 内の tool_uses は subagent_id で紐づく（OK）
- メイン agent の tool_uses は turn_index 経由で turn_id に変換（B の time-travel 問題と同根）

### 解決方針

B が解決すれば連鎖的に改善。さらに parseTranscript で `turnIndex` の確定をより堅牢にする。

## Bug F / G / H / I: turn duration / response 関連

### F: turns.duration_ms 全件 NULL

handleStop の duration 計算:
```ts
if (responseTime && turn.promptSubmittedAt) {
  const diff = responseTime.getTime() - turn.promptSubmittedAt.getTime();
  if (diff > 0) computedDurationMs = diff;
}
```

B の問題で `responseTime < promptSubmittedAt` になり `diff > 0` 不成立 → duration スキップ。B 解決で連鎖改善。

### G: turns.response_text NULL（43/100）

response_texts の matching 失敗 + key match 不一致 → 一部 turn が更新スキップ。B 解決で改善。

### H: turns.input_tokens=0（40/100）

同上、response_texts 経由で per-turn token を更新する経路が壊れている。B 解決で改善。

### I: sessions.duration_ms NULL

`handleSessionEnd` が呼ばれていない（多くは active session）or `endedAt` が未保存。アクティブセッションは仕様通り NULL。

## Bug J / K / L: subagent 軽微

- 1 件 stopped_at NULL（ただし duration_seconds は計算済 → 古いデータ）
- 1 件 turn_id NULL（孤児）
- 2 件 agent_model NULL/unknown

D-005（subagent NULL 時刻データ）の方針通り「保持」。新規データの追加バリデーションのみ将来検討。

## タスク分解

承認後 `docs/tasks/list.md` に Phase 8 として登録予定:

- P8-T1: B 修正（buildTurnIndexMap chronological constraint + handleStop guard + 既存データ修正 SQL）
- P8-T2: C 修正（parseTranscript で executedAt 抽出 → hook payload → DB 保存）
- P8-T3: D/E の追加修正（必要なら、B 解決後に再評価）
- P8-T4: F/G/H 確認（B/C 解決で連鎖改善されることを検証、必要なら追加対応）
- P8-T5: 監査スクリプト `scripts/audit-data-integrity.ts` を新規（CI で常時データ歪み監視）

## 既存データの扱い

- B 由来の time-travel は SQL で正規化（`response_completed_at < prompt_submitted_at` を NULL に戻す）
- C: tool_uses.executed_at は新規データから埋まる（バックフィル不要、D-001 C 案と同方針）
- F-I: B/C 解決後に新規データから自然と埋まる
