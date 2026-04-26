# P1.5-T3: turnIndex → DB turnId マッチに positional fallback（#2）

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **依存**: P1.5-T2 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a70eb8ce3b84cf69c）

## 完了内容

### 実装
- `hookService.ts`: `normalizePromptKey` と `buildTurnIndexMap` を top-level pure 関数として export
- `handleStop` 内 22 行のインラインマッチング → ヘルパ呼出し 1 行に置換
- 2 段階マッチング:
  - Stage 1: 既存の `normalizePromptKey` で key match
  - Stage 2: key 不一致 / `promptText` 欠落時 → 未マッチ DB turn の先頭 (`shift()`) を採用
- response_texts > dbTurns（compaction シナリオ）→ 余剰は無視
- dbTurns > response_texts → 余剰 DB turn は紐付けされず（既存挙動）

### テスト
- `tests/hookService.turnMatch.test.ts` 新規 9 テスト（M1〜M7c）
- 結果: **114/114 pass**、tsc clean

### 既存セッション 18 (3 DB turns) の挙動変化
- 旧: key match 失敗 → turnIndexToDbId 空 → `resolveTurnId(0..2)` 全て null → tool_uses/file_changes は turnId=null、per-turn token / duration / response_text 反映ループ全空
- 新: positional fallback で turnIndex 0→#1, 1→#2, 2→#3 を生成 → 正しい turnId 取得 → 反映ループが機能 → **per-turn token が埋まる**

## 申し送り
- T4 schema 変更時もマッチングロジックは `buildTurnIndexMap` 経由を維持（インライン化禁止）
- 後段の per-turn token 上書きロジック自体に他バグが潜んでいないかは T4 で要確認
