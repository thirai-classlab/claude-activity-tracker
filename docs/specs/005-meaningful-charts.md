# Spec 005: 意味のあるダッシュボードグラフ（D-013）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [specs/](.) > **005-meaningful-charts.md**
> **ステータス**: ✅ 承認済（D-013、2026-04-27）

## 目的

cache_read が量で 100〜1000x、価値（コスト）で 0.1x と歪んでいる現状、量ベースのスタックグラフが最も価値のない量に画面占有 85% を支配される問題を解消する。同時に「メンバー別トークン使用量」の可視性は維持する。

## 設計方針

### 1. 主役チャート: メンバー別 `$` ランキング棒

`/members` ページ上段:
- X 軸: メンバー
- Y 軸: 累積コスト ($USD)
- ソート: 降順（コスト多い人から）

### 2. セカンダリ: Small Multiples（4 個小バー）

`/members` ページ中段に、4 個の小バーチャートを横並び:
- input トークン
- output トークン
- cache_creation トークン
- cache_read トークン

各チャートは独自の Y 軸スケール、メンバー順は固定（主役チャートと同じ並び）。これで「種別ごとの偏り」が視覚的に分かる。

### 3. 詳細テーブル（sortable）

下段:
| メンバー | $ コスト | input | output | cache_create | cache_read | turns | tools |
|--------|---------|------|-------|------------|-----------|-------|-------|
| 数値整形 | $123.45 | 15K | 1.3M | 5.2M | 213M | 23 | 456 |

- すべての列でソート可能
- 数値は `formatCompact` (15K, 1.3M, 213M) で表示
- セルは tooltip で正確な値を表示

### 4. `/tokens` ページの再設計

主役グラフを `$` 軸推移（モデル別積み上げ）に変更。サブタブ「raw tokens」で従来のトークン推移を残す。トークン推移グラフでは **cache_read を除外**、input/output/cache_create の 3 種で積み上げ。

`cacheEfficiency` と「累積 cache_read」は KPI カードで保持。

### 5. レガシー EJS 側

`server/views/dashboard.ejs` の同等箇所も同方針で改修。優先度低、別タスク扱いも可。

## 実装範囲

### 新規ファイル
- `server/src/components/charts/MemberCostBarChart.tsx`
- `server/src/components/charts/SmallMultiplesTokens.tsx`
- `server/src/components/pages/members/MemberTokensTable.tsx`

### 編集ファイル
- `server/src/components/pages/members/MembersPage.tsx`: 上記コンポーネント組込み
- `server/src/components/pages/tokens/TokensPage.tsx`: 主軸を `$` に、cache_read 除外
- `server/views/dashboard.ejs`: レガシー側同等対応（後続）

## 受入基準

- [ ] `/members` で「メンバー別 $ ランキング」が見える
- [ ] Small multiples 4 個（input/output/cache_create/cache_read）が並んで表示
- [ ] sortable table で 4 種トークン + コスト + ターン数が見える
- [ ] `/tokens` の主役グラフが `$` 軸
- [ ] cache_read が KPI 単独表示を維持しつつ、グラフから消える
- [ ] 既存テスト全件緑、tsc clean

## タスク分解

承認後 `docs/tasks/list.md` に登録:
- P5-T1: `MemberCostBarChart.tsx` 新規 + テスト
- P5-T2: `SmallMultiplesTokens.tsx` 新規 + テスト
- P5-T3: `MemberTokensTable.tsx` 新規 + テスト
- P5-T4: `MembersPage.tsx` 統合
- P5-T5: `TokensPage.tsx` 主軸 `$` + cache_read 除外
- P5-T6: レガシー EJS 対応（オプション）
