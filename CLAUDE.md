# Claude Code Activity Tracker

チームの Claude Code 利用状況を自動収集・可視化するシステム。
Hook → API サーバー → ダッシュボード の構成。

## アーキテクチャ

```
各メンバーPC                          サーバー (Docker)
~/.claude/hooks/log-*.js (6種)  →  Express + Prisma + EJS
  POST /api/hook/*                   /api/hook/* (6EP)
                                     /api/dashboard/* (18EP)
                                     MariaDB (Docker Compose)
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
| `server/views/dashboard.ejs` | ダッシュボード HTML |
| `server/public/js/dashboard.js` | フロントエンド JS（~2500行） |
| `setup/hooks/shared/utils.js` | フック共通ユーティリティ（15関数） |
| `setup/hooks/log-*.js` | 6種のフックスクリプト |
| `setup/install-mac.sh` / `install-win.ps1` | インストーラ |

## 技術スタック

Express 4 + TypeScript, Prisma 6 (MariaDB), EJS + Chart.js 4, Docker (node:20-slim + mariadb:11)

## 開発コマンド

```bash
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
- transcript 解析はフック側（`log-stop.js`）で行い、サーバーは DB 書き込みのみ
- メンバー識別は `gitEmail`（`git config user.email`）が主キー
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
| [server/.env.example](server/.env.example) | 環境変数一覧・Docker使用手順 | 設定変更・デプロイ時 |
| [server/Dockerfile](server/Dockerfile) | Docker イメージ定義 | コンテナ構成を変更するとき |
