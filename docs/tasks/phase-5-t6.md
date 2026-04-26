# P5-T6: レガシー EJS (`/legacy`) 対応

> **設計**: [005-meaningful-charts.md](../specs/005-meaningful-charts.md)
> **依存**: P5-T1〜T5 完了
> **ステータス**: `[x]` 完了（2026-04-27、サブエージェント a4d7d65354c1be6fa）

## 完了内容

`server/public/js/dashboard.js` に追加:
- `view-members`: 3 セクション新規（コストランキング棒、small multiples 4 個、sortable table）
- `view-tokens`: 日次トークン推移の datasets から cache_read を除外（input/output/cache_create のみ）
- `view-dashboard`: 折れ線グラフでも cache_read を cache_creation に置換

`views/dashboard.ejs` は無変更（CSS / canvas は inline style で吸収）。

### 結果
- server tests: **143/143 pass**
- `node --check`: syntax OK
- 既存挙動（heatmap, セッション一覧, インタラクティブメンバー一覧）はすべて保持
- `charts['<key>']` レジストリで Chart.js リーク回避
