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
                                     /api/dashboard/* (21EP)
                                     Socket.IO (AI チャット)
                                     Next.js App Router (フロントエンド)
                                     MariaDB (Docker Compose)

ルーティング:
  /            → Next.js (新ダッシュボード)
  /legacy      → EJS (レガシーダッシュボード)
  /api/*       → Express API
  Socket.IO    → AI チャット (Agent SDK + MCP ツール)
```

## 主要ディレクトリ

| パス | 役割 |
|------|------|
| `server/src/routes/hookRoutes.ts` | Hook API（6 POST エンドポイント） |
| `server/src/routes/dashboardRoutes.ts` | Dashboard API（21 エンドポイント） |
| `server/src/services/hookService.ts` | フックデータ処理・DB書き込み |
| `server/src/services/dashboardService.ts` | 集計クエリ（`$queryRawUnsafe`） |
| `server/src/services/chatService.ts` | AI チャット（Agent SDK + Socket.IO + MCP ツール） |
| `server/src/services/analysisService.ts` | メンバー分析ログ CRUD |
| `server/src/services/costCalculator.ts` | モデル別コスト算出 |
| `server/src/utils/toolCategory.ts` | ツール分類ロジック |
| `server/prisma/schema.prisma` | DB スキーマ（8テーブル） |
| `server/src/app/` | Next.js App Router ページ（9ルート） |
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

- **バックエンド**: Express 4 + TypeScript, Prisma 6 (MariaDB), Socket.IO 4
- **AI**: Claude Agent SDK + MCP ツール（Socket.IO ストリーミング）
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
npm test                        # parser 単体テスト + fixture インフレ率ガード（CI でも実行）
npm run test:api                # API 自動テスト（24テスト、要サーバ起動）
npx prisma studio               # DB GUI

# フック側テスト（Vitest）
cd ../setup/hooks && npm install && npm test
```

### テストの役割分担

| スクリプト | 場所 | 内容 |
|-----------|------|------|
| `setup/hooks && npm test` | `tests/parseTranscript.test.js` + `tests/inflation.test.js` | dedup U1-U9 + fixture で `rowRatio ≥ 1.5` かつ `tokenRatio ≥ 1.5` を検証 |
| `server && npm test` | `tests/transcriptParser.test.ts` + `tests/inflation.test.ts` | サーバ側 parser で同条件を検証（node:test + tsx） |
| `server && npm run test:api` | `scripts/test-api.ts` | Hook/Dashboard API の E2E、MariaDB + サーバ起動必要 |

fixture（`tests/fixtures/*.jsonl`）はユーザープロンプト本文を含むため `.gitignore` 済み。CI では合成 U1-U9 スイートのみ走り、ローカルでは fixture 有無に応じてインフレ率テストが自動で有効化される。`.github/workflows/test.yml` が push/PR 時に `hooks-tests` / `server-tests` / `api-smoke` を起動する。

## 開発ポリシー

- **自律実行（最優先原則）**: 可能な限り自律的に進める。ユーザーの応答を待たない。
  - 明確に判断できるものは判断し、実行する
  - **判断不可の場合は保留して次のタスクに進む**。作業を止めない
  - 保留した判断はすべて [`docs/decisions/pending.md`](docs/decisions/pending.md) にファイル管理する（後述「判断待ちの管理」参照）
  - 各ターンの最後に `pending.md` の未解決項目を必ず表示する
- **TDD（テスト駆動開発）** で進める
  1. テスト専門エージェント（`/sc:test`）にテスト観点・テストパターンを洗い出させる
  2. テストを設計・実装する（Red）
  3. プロダクションコードを実装してテストを通す（Green）
  4. リファクタリング（Refactor）
- **サブエージェント委譲**: メインエージェントは `server/src/`, `setup/hooks/`, `scripts/` を直接編集・読取しない。すべて `Agent` tool 経由でサブエージェントに委譲する。メインの役割はアサイン・タスク管理・完了確認。Hook で強制（`.claude/settings.local.json`）。
- **指摘対応**: 指摘やエラーを受けた場合は必ず根本原因特定 → 修正 → 再発防止策 → `.claude/rules/` への追記提案、の順で対応する。
- **タスク管理**: `docs/tasks/list.md` でタスク一覧を管理。追加・ステータス変更・完了の操作はメインエージェントのみが行う。
- **設計→承認→タスク追加フロー**:
  1. 設計ドキュメントを `docs/draft/` に作成（未承認状態）
  2. ユーザーにレビュー・承認を依頼
  3. 承認後に `docs/tasks/list.md` と個別タスクファイルに追加
  - **設計なしのタスク追加は禁止**

## 判断待ちの管理（必須）

ユーザーの判断を仰ぎたい項目は、会話メッセージではなく**必ず `docs/decisions/pending.md` にファイルとして記録**する。

### 運用ルール

1. **記録**: 判断が必要と判断した瞬間に `pending.md` へ `D-NNN` として追記（スキーマは同ファイル冒頭参照）
2. **既定方針で続行**: 各項目に「保留時の既定（推奨）」を必ず書く。ユーザー応答が来るまで Claude はその既定方針で自律的に作業を進める
3. **ブロックされるタスク**: 既定方針でも進められないタスクは「🔴 ブロッカー」マークを付け、当該タスクはスキップして次に進む
4. **ターン終了時の表示**: 各応答の最後に `pending.md` の未解決項目を要約表示（ID / 項目 / 推奨既定のみ）
5. **判断が下った時**: `pending.md` から該当エントリを削除し、[`docs/decisions/resolved.md`](docs/decisions/resolved.md) へ移動

### 関連ファイル

- [`docs/decisions/pending.md`](docs/decisions/pending.md) — 判断待ち（SSOT）
- [`docs/decisions/resolved.md`](docs/decisions/resolved.md) — 判断済み履歴
- [`.claude/rules/autonomy.md`](.claude/rules/autonomy.md) — 自律実行ルールの詳細

## `.claude/rules/`

プロジェクト固有のルールは `.claude/rules/` に配置。YAML フロントマターの `paths` で対象ファイルをスコープ指定でき、該当ファイルを読んだ時のみ自動ロードされる。

| ルールファイル | スコープ | 内容 |
|--------------|---------|------|
| [`autonomy.md`](.claude/rules/autonomy.md) | （常時ロード） | 自律実行ポリシー、判断待ちファイル運用、ターン終了時の表示義務 |
| [`subagent-behavior.md`](.claude/rules/subagent-behavior.md) | （常時ロード） | サブエージェントの権限認識、完了報告テンプレ、諦めない行動指針 |
| [`development-process.md`](.claude/rules/development-process.md) | `server/src/**`, `setup/hooks/**`, `scripts/**` | TDD、サブエージェント委譲、指摘対応フロー |
| [`task-management.md`](.claude/rules/task-management.md) | `docs/tasks/**`, `docs/draft/**` | 設計→承認→タスク追加フロー |
| [`decisions.md`](.claude/rules/decisions.md) | `docs/decisions/**` | 判断待ち項目のスキーマ・ライフサイクル |
| [`database.md`](.claude/rules/database.md) | `server/src/lib/**`, `server/prisma/**` | DB 運用ルール、マイグレーション、環境変数フォールバック |
| [`styling.md`](.claude/rules/styling.md) | `server/src/**/*.tsx`, `server/src/**/*.css` | カラー・タイポ・レスポンシブ規約 |
| [`auth.md`](.claude/rules/auth.md) | 認証関連ファイル | 認証プロバイダ・ミドルウェア規約 |

ルールの追加・変更時は必ずこのテーブルも更新すること。

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
- **GitHub MCP 連携**: `.env` に `GITHUB_PAT` を設定すると、AI チャット・メンバー分析で GitHub リポジトリの内容を参照可能。GitHub Copilot MCP サーバー（`https://api.githubcopilot.com/mcp`）を `McpHttpServerConfig` で接続。未設定時は GitHub ツールがスキップされる

## 詳細ドキュメント（必要時に参照）

| ドキュメント | 内容 | いつ読むか |
|-------------|------|-----------|
| [README.md](README.md) | 全体像・セットアップ手順・Mermaid図 | プロジェクト概要を把握したいとき |
| [setup/README.md](setup/README.md) | フックインストールガイド | インストーラを修正するとき |
| [docs/database-design.md](docs/database-design.md) | DB スキーマ詳細・リレーション（8テーブル） | スキーマ変更・クエリ追加時 |
| [docs/hook-data-reference.md](docs/hook-data-reference.md) | フックが送受信するデータ形式 | フック・Hook API を修正するとき |
| [docs/dashboard-design.md](docs/dashboard-design.md) | ダッシュボード画面設計 | ダッシュボード UI を修正するとき |
| [docs/known-issues.md](docs/known-issues.md) | MariaDB/Windows/フックの注意点・トラブルシューティング | バグ修正・環境問題の調査時 |
| [docs/hook-test-guide.md](docs/hook-test-guide.md) | フックのテスト手順 | フックの動作確認時 |
| [docs/ai-productivity-kpi-report.md](docs/ai-productivity-kpi-report.md) | AI駆動開発 生産性KPI企画書 | KPI設計・ダッシュボード拡張時 |
| [docs/analytics-expansion-plan.md](docs/analytics-expansion-plan.md) | ダッシュボード分析機能 拡張企画書 | 分析機能の追加・新規ページ設計時 |
| [server/.env.example](server/.env.example) | 環境変数一覧・Docker使用手順 | 設定変更・デプロイ時 |
| [server/Dockerfile](server/Dockerfile) | Docker イメージ定義 | コンテナ構成を変更するとき |
| [docs/specs/](docs/specs/) | 承認済み実装仕様（001: dedup, 002: pricing, 003: npx installer） | 実装着手時の原典 |
| [docs/tasks/list.md](docs/tasks/list.md) | タスク一覧（Phase 1〜3） | 進捗確認・タスク追加時 |
| [docs/decisions/pending.md](docs/decisions/pending.md) | 未解決の判断待ち項目 | 毎ターン末に参照必須 |
| [docs/decisions/resolved.md](docs/decisions/resolved.md) | 判断済み履歴（根拠込み） | 過去判断の参照時 |
| [docs/announcements/2026-04-data-correction.md](docs/announcements/2026-04-data-correction.md) | 過去数値 ~2x 膨張の告知 | 社内共有・KPI 再説明時 |

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
