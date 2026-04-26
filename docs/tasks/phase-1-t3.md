# P1-T3: `handleStop` の turnCount / toolUseCount を DB 実数に切替

> **設計**: [001-transcript-dedup.md](../specs/001-transcript-dedup.md) | **依存**: P1-T1
> **ステータス**: `[x]` 完了（2026-04-25）

## 完了報告（サブエージェント a8f1b7cf7f6c589a9）

### 実装
- `server/src/services/hookService.ts` `handleStop`:
  - 旧: `turnCount: data.turn_count || 0`、`toolUseCount: data.tool_use_count || 0`
  - 新: file_changes 保存後に `prisma.turn.count` / `prisma.toolUse.count({ subagentId: null })` で実数再取得し session を再 update
- 変更行数: +20 行（571 → 591、上限 800 以内）

### テスト
- `server/scripts/test-api.ts` に P1-T3 検証 2 件追加:
  - 通常値（turn_count=1, tool_use_count=3）送信 → DB 実数と一致
  - 膨張値（999, 999）送信 → DB 実数で上書きされる回帰ガード
- 既存 `dashboardGet` ヘルパに `x-api-key` 追加（dashboard 側認証必須）
- 結果: **26/26 pass**（既存 24 + 新規 2）

### 副作用
- 正方向のみ。`dashboardService.ts` L153 既に「`session.turnCount` stale の可能性」対応済みで、今回の修正で解消
- 過去セッションは次の `handleStop` 呼出しで自動補正（個別 backfill 不要）
- 並行作業で Docker ポート 3010 に切替あり（`HOST_PORT=3010` 明示で再起動済み。コード変更とは無関係）

### 変更ファイル
- `/Users/t.hirai/develop/claude-activity-tracker/server/src/services/hookService.ts`
- `/Users/t.hirai/develop/claude-activity-tracker/server/scripts/test-api.ts`
