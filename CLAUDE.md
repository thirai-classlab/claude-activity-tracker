# Claude Code Activity Tracker

> **パンくず**: [README.md](README.md) > **CLAUDE.md**

チームの Claude Code 利用状況を自動収集・可視化するシステム。
Hook → API サーバー → ダッシュボード の構成。

## 目次

- [アーキテクチャ](#アーキテクチャ)
- [主要ディレクトリ](#主要ディレクトリ)
- [技術スタック](#技術スタック)
- [開発コマンド](#開発コマンド)
- [重要な設計判断](#重要な設計判断)
- [詳細ドキュメント（必要時に参照）](#詳細ドキュメント必要時に参照)

---

## アーキテクチャ

```
各メンバーPC                          サーバー (Docker)
~/.claude/hooks/aidd-log-*.js (6種)  →  Express + Next.js ハイブリッド
  POST /api/hook/*                   /api/hook/* (6EP)
                                     /api/dashboard/* (18EP)
                                     Next.js App Router (フロントエンド)
                                     MariaDB (Docker Compose)

ルーティング:
  /            → Next.js (新ダッシュボード)
  /legacy      → EJS (レガシーダッシュボード)
  /api/*       → Express API
```

## 主要ディレクトリ

| パス | 役割 |
|------|------|
| `server/src/routes/hookRoutes.ts` | Hook API（6 POST エンドポイント） |
| `server/src/routes/dashboardRoutes.ts` | Dashboard API（14 GET エンドポイント） |
| `server/src/services/hookService.ts` | フックデータ処理・DB書き込み |
| `server/src/services/dashboardService.ts` | 集計クエリ（`$queryRawUnsafe`） |
| `server/src/services/costCalculator.ts` | モデル別コスト算出 |
| `server/src/utils/toolCategory.ts` | ツール分類ロジック |
| `server/prisma/schema.prisma` | DB スキーマ（7テーブル） |
| `server/src/app/` | Next.js App Router ページ（8ルート） |
| `server/src/components/` | React コンポーネント（layout/shared/charts/pages） |
| `server/src/hooks/` | React カスタムフック（useFilters, useApi） |
| `server/src/lib/` | ユーティリティ（api, types, formatters, hints, trend, regression） |
| `server/views/dashboard.ejs` | レガシーダッシュボード HTML |
| `server/public/js/dashboard.js` | レガシーフロントエンド JS（~2500行） |
| `setup/hooks/shared/utils.js` | フック共通ユーティリティ（15関数） |
| `setup/hooks/aidd-log-*.js` | 6種のフックスクリプト |
| `setup/hooks/config.json.example` | フック設定テンプレート |
| `setup/install-mac.sh` / `install-win.ps1` | インストーラ |
| `init.sh` | 初期設定スクリプト（.env + config.json 生成） |

## 技術スタック

- **バックエンド**: Express 4 + TypeScript, Prisma 6 (MariaDB)
- **フロントエンド（新）**: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui + TanStack Query v5 + react-chartjs-2
- **フロントエンド（レガシー）**: EJS + Chart.js 4 + vanilla JS
- **インフラ**: Docker (node:20-slim + mariadb:11)
- **ビルド**: `tsconfig.json`（Next.js）+ `tsconfig.server.json`（Express）のデュアル構成

## 開発コマンド

```bash
bash init.sh                    # 初期設定（.env + config.json 生成）
cd server/
docker compose up -d --build    # Docker 起動（推奨）
npm run dev                     # ローカル開発（ホットリロード）
npm run test:api                # API 自動テスト（24テスト）
npx prisma studio               # DB GUI
```

## 重要な設計判断

- **DB は MariaDB**（Docker Compose で `mariadb:11` コンテナを起動）
- Raw SQL では `CAST(... AS DOUBLE)` を使用（Prisma の BigInt 問題回避）
- フックの実行順序は保証されない → `hookService.ts` の `findOrCreateSession()` でスタブ作成対応
- transcript 解析はフック側（`aidd-log-stop.js`）で行い、サーバーは DB 書き込みのみ
- メンバー識別は `gitEmail`（`git config user.email`）が主キー
- **Express + Next.js ハイブリッド**: 単一プロセスでカスタムサーバーパターンを採用。Express API は変更なし、Next.js がフロントエンドを担当。レガシー EJS は `/legacy` で引き続きアクセス可能
- **デュアル tsconfig**: `tsconfig.json`（Next.js + React）と `tsconfig.server.json`（Express、`src/app`, `src/components`, `src/hooks` を除外）
- **`NEXT_PUBLIC_API_KEY`**: Next.js クライアントコンポーネントから Dashboard API にアクセスするための環境変数。`.env` に `API_KEY` と同じ値を設定
- **API キー認証**: Hook API は `X-API-Key` ヘッダーで保護。サーバー `.env`（`API_KEY`）とクライアント `config.json`（`api_key`）で同じ値を設定する。未設定時は認証スキップ（開発モード）。Docker で `.env` を変更した場合は `docker compose up -d --force-recreate` が必要（`restart` では反映されない）

## 詳細ドキュメント（必要時に参照）

| ドキュメント | 内容 | いつ読むか |
|-------------|------|-----------|
| [README.md](README.md) | 全体像・セットアップ手順・Mermaid図 | プロジェクト概要を把握したいとき |
| [setup/README.md](setup/README.md) | フックインストールガイド | インストーラを修正するとき |
| [docs/database-design.md](docs/database-design.md) | DB スキーマ詳細・リレーション | スキーマ変更・クエリ追加時 |
| [docs/hook-data-reference.md](docs/hook-data-reference.md) | フックが送受信するデータ形式 | フック・Hook API を修正するとき |
| [docs/dashboard-design.md](docs/dashboard-design.md) | ダッシュボード画面設計 | ダッシュボード UI を修正するとき |
| [docs/known-issues.md](docs/known-issues.md) | MariaDB/Windows/フックの注意点・トラブルシューティング | バグ修正・環境問題の調査時 |
| [docs/hook-test-guide.md](docs/hook-test-guide.md) | フックのテスト手順 | フックの動作確認時 |
| [docs/ai-productivity-kpi-report.md](docs/ai-productivity-kpi-report.md) | AI駆動開発 生産性KPI企画書 | KPI設計・ダッシュボード拡張時 |
| [docs/analytics-expansion-plan.md](docs/analytics-expansion-plan.md) | ダッシュボード分析機能 拡張企画書 | 分析機能の追加・新規ページ設計時 |
| [server/.env.example](server/.env.example) | 環境変数一覧・Docker使用手順 | 設定変更・デプロイ時 |
| [server/Dockerfile](server/Dockerfile) | Docker イメージ定義 | コンテナ構成を変更するとき |

## ドキュメント作成ルール

- **資料を作成・追加した場合は、必ず README.md の「関連ドキュメント」セクションと CLAUDE.md の「詳細ドキュメント」テーブルを更新すること**
- docs/ 配下のドキュメントは以下のテンプレートに従って作成する

### ドキュメントテンプレート

```markdown
# タイトル

> **パンくず**: [README.md](../README.md) > [docs/](.) > **本ファイル名**

## 目次

- [セクション1](#セクション1)
- [セクション2](#セクション2)
- ...

---

## セクション1

本文...

### チャート例（Mermaid を積極的に使用）

﻿```mermaid
graph LR
    A[入力] --> B[処理] --> C[出力]
﻿```

### テーブル例

| 項目 | 説明 |
|------|------|
| ... | ... |

---

## 参考文献（外部情報を参照した場合は必須）

- [タイトル](URL) - 補足説明
```

### テンプレート使用ルール

| ルール | 内容 |
|--------|------|
| パンくず | 先頭に必ずパンくずナビゲーションを記載 |
| 目次 | セクションが3つ以上ある場合は目次を記載 |
| Mermaid | 構造・フロー・関係性の説明には Mermaid 図を使用（`graph LR` 推奨） |
| テーブル | 一覧・比較には Markdown テーブルを使用 |
| 参考文献 | 外部情報を参照した場合はリンク付きで記載 |
| README 更新 | 資料追加時に README.md と CLAUDE.md の両方のドキュメント一覧を更新 |
