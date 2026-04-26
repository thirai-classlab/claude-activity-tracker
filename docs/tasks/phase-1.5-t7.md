# P1.5-T7: E2E 統合 + 回帰確認

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **依存**: P1.5-T1〜T6 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a35a6aa5cb79199bf）

## 完了内容

### 追加テスト
`server/scripts/test-api.ts` に Phase 1.5 E2E ブロック `testPhase15Integration` 追加（3 ケース）:
- subagent カラム分離検証（POST /stop → DB / GET /stats）
- cacheEfficiency が 0〜1 範囲
- daily grand total 不変条件

### テスト結果
- `cd server && npm test`: **124/124 pass**
- `cd setup/hooks && npm test`: **14/14 pass**
- `npm run test:api`: **31/32 pass**（失敗 1 件は P1.5 と無関係の `/docs/` redirect ループ → D-011 として起票）

### バグ最終状態
- #2 turn match 失敗 → 修正済（buildTurnIndexMap 2 段マッチ、新規セッションは埋まる）
- #4 subagent 二重計上 → 修正済（schema 分離、grand total 集計）
- #7 最終ターン duration → 修正済（transcript timestamp 優先）
- #12 cacheEfficiency 100% 超 → 修正済（0〜1 範囲、E2E で assert）

### 既存セッション スモークチェック（D-001 C 案準拠）
- session 1-33: `subagent_input_tokens=0`（バックフィル無し、注釈バナーで運用）
- session 36（新規）: `total=25000 + subagent=1200 = grand 26200`（カラム分離効果）

### CI workflow
- YAML valid 確認、3 jobs（hooks-tests / server-tests / api-smoke）
- 全テストが CI で実行される

### 申し送り
- `/docs/` redirect 無限ループ（D-011 別起票）
- `api-smoke` CI ジョブの `continue-on-error: true` を後続で `false` に
