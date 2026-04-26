# P1-T5': UI に「計測不能期間」注釈バナー追加（D-001 C 案）

> **設計**: [001-transcript-dedup.md](../specs/001-transcript-dedup.md) | **依存**: P1-T1 リリース
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント aa75567d9cd3d1853）

## 完了内容

### 新規
- `server/src/components/layout/MetricsCorrectionBanner.tsx` (56 行): `useFilters()` で `filters.from >= cutoff` なら `null` 返却

### 編集
- `server/src/app/layout.tsx`: `<MetricsCorrectionBanner />` を `.main-content` 冒頭に
- `server/src/lib/constants.ts`: `METRICS_FIXED_SINCE = process.env.NEXT_PUBLIC_METRICS_FIXED_SINCE ?? process.env.METRICS_FIXED_SINCE ?? '2026-04-25'`
- `server/src/index.ts`: `/legacy` ルートで `metricsFixedSince` を EJS に渡す
- `server/views/dashboard.ejs`: `<main>` 直下に同一バナー、`data-cutoff` + バニラ JS で `change` イベント冪等切替
- `server/.env.example`: `METRICS_FIXED_SINCE` / `NEXT_PUBLIC_METRICS_FIXED_SINCE` 説明付き追加

### スタイル
Tailwind 未採用の既存コードベースに合わせ、inline style で dark theme 向け配色:
- bg: `rgba(245,158,11,0.12)` / border: `rgba(245,158,11,0.45)` / text: `#fde68a`（amber-200）

### 残件 → 別タスク化候補
- バナー内 `/docs/announcements/2026-04-data-correction.md` リンクは現状 404（Express/Next.js は `docs/` を静的配信していない） → **D-007 参照**
- Tailwind 導入 or 共通 CSS クラス抽出 → 低優先

## スコープ
- 新 (Next.js) → レガシー (EJS) 両ダッシュボードのヘッダ直下に警告バナー
- 「2026-04-25 以前のデータは集計ロジック修正前のため 1.7〜62 倍に膨張している」旨
- 環境変数 `METRICS_FIXED_SINCE`（ISO 日付、未設定時は `2026-04-25`）で cutoff date 管理

## 受入基準
- [ ] Next.js `server/src/components/layout/` に `MetricsCorrectionBanner.tsx` 新規
- [ ] `server/src/app/layout.tsx` にマウント（全ページ共通）
- [ ] レガシー `server/views/dashboard.ejs` にも同等バナー
- [ ] `server/.env.example` に `METRICS_FIXED_SINCE` のデフォルト値と説明を追記
- [ ] フィルタが cutoff 以降限定の場合はバナー非表示
- [ ] 文言は [`docs/announcements/2026-04-data-correction.md`](../announcements/2026-04-data-correction.md) の 3 行まとめを流用

## 委譲
`server/src/components/` `server/src/app/` `server/views/` はメイン編集不可。Agent 経由。
