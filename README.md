# Claude Code Activity Tracker

> **ドキュメント階層**: README.md（本ファイル）| [CLAUDE.md](CLAUDE.md) | [setup/README.md](setup/README.md) | [docs/](docs/)

自分やチームの AI（Claude Code）利用状況を自動収集・可視化して、開発プロセスの改善に役立てるためのシステムです。

各メンバーの PC にインストールしたフックスクリプトが Claude Code の操作データをサーバーに送信し、ダッシュボードでリアルタイムに可視化します。

---

## 目次

- [全体像](#全体像)
- [ダッシュボード](#ダッシュボード)
- [クイックスタート（ユースケース別）](#クイックスタートユースケース別)
- [セットアップ（詳細）](#セットアップ詳細)
- [データ収集フロー](#データ収集フロー)
- [収集データ](#収集データ)
- [ディレクトリ構成](#ディレクトリ構成)
- [手動セットアップ（開発用）](#手動セットアップ開発用)
- [環境変数（server/.env）](#環境変数serverenv)
- [セキュリティ](#セキュリティ)
- [トラブルシューティング](#トラブルシューティング)
- [関連ドキュメント](#関連ドキュメント)

---

## 全体像

```mermaid
graph TB
    subgraph "メンバー A の PC"
        CC_A[Claude Code] -->|イベント発火| H_A["~/.claude/hooks/<br/>aidd-log-*.js (6種)"]
    end

    subgraph "メンバー B の PC"
        CC_B[Claude Code] -->|イベント発火| H_B["~/.claude/hooks/<br/>aidd-log-*.js (6種)"]
    end

    subgraph "メンバー C の PC"
        CC_C[Claude Code] -->|イベント発火| H_C["~/.claude/hooks/<br/>aidd-log-*.js (6種)"]
    end

    H_A -->|HTTP POST| API
    H_B -->|HTTP POST| API
    H_C -->|HTTP POST| API

    subgraph "サーバー (Docker)"
        API["Hook API<br/>/api/hook/* (6EP)"]
        API --> DB[(MariaDB)]
        DB --> DASH_API["Dashboard API<br/>/api/dashboard/* (18EP)"]
        DASH_API --> DASH["ダッシュボード<br/>Chart.js + EJS"]
    end

    BROWSER[ブラウザ] -->|閲覧| DASH
```

---

## ダッシュボード

### 概要ダッシュボード

KPI サマリー・日別トークン推移・ツール使用状況・時間帯ヒートマップ・生産性レーダーチャートを一画面で把握できます。

![概要ダッシュボード](docs/screenshots/01-overview-dashboard.png)

### トークン利用分析

日次のトークン使用量推移（モデル別積み上げ）、モデル別コスト分布、メンバー別トークン消費量を詳細に分析できます。

![トークン利用分析](docs/screenshots/02-token-analysis.png)

### メンバー分析

メンバー×日付のトークン数ヒートマップとターン・セッション数ヒートマップを上部に表示。下部は左右分割レイアウトで、左にメンバー一覧テーブル、右に選択メンバーの詳細（日別推移・モデル比率・最近のセッション）を表示します。

![メンバー分析](docs/screenshots/03-member-analysis.png)

### リポジトリ分析

左右分割レイアウトで、左にリポジトリ一覧テーブル、右に選択リポジトリの詳細（日別セッション推移・メンバー比率・ブランチ別集計・最近のセッション）を表示します。

![リポジトリ分析](docs/screenshots/04-repository-analysis.png)

### セッション履歴

左右分割レイアウトで、左にセッション一覧（検索・フィルター・ページネーション付き）、右に選択セッションの詳細を表示します。

![セッション履歴](docs/screenshots/05-session-history.png)

### プロンプトフィード

メンバーが送信したプロンプトをリアルタイムでカード形式で表示します。15 秒間隔の自動更新に対応し、メンバー・リポジトリ・モデルでフィルタリングできます。

![プロンプトフィード](docs/screenshots/06-prompt-feed.png)

---

## クイックスタート（ユースケース別）

### ケース 1: 個人で自分の利用状況を分析したい

> 自分のトークン消費量やコスト、ツール使用傾向を把握したい場合

```
自分の PC 1台で完結（サーバーもローカル）
```

```bash
# 1. リポジトリを取得
git clone <repository-url> && cd claude-activity-tracker

# 2. 初期設定（.env + config.json を自動生成）
bash init.sh
#   API URL → http://localhost:3001（デフォルトのまま Enter）
#   BASIC_AUTH_PASSWORD → 空欄でOK（ローカルなので不要）

# 3. サーバー起動
cd server && docker compose up -d --build && cd ..

# 4. フックをインストール
cd setup && bash install-mac.sh && cd ..

# 5. Claude Code を再起動 → 次のセッションからデータ記録開始
# 6. ブラウザで http://localhost:3001 を開く
```

所要時間: 約5分

---

### ケース 2: チームの AI 駆動開発を可視化したい

> マネージャー/リーダーがチーム全体のコスト・生産性・活用状況を把握したい場合

```
管理者: 共有サーバーにデプロイ
各メンバー: 自分の PC にフックをインストール
```

**管理者の作業:**

```bash
# 1. サーバーにリポジトリを取得
git clone <repository-url> && cd claude-activity-tracker

# 2. 初期設定
bash init.sh
#   API URL → https://your-server.example.com（メンバーからアクセスできる URL）
#   BASIC_AUTH_PASSWORD → ダッシュボード閲覧用パスワードを設定

# 3. サーバー起動
cd server && docker compose up -d --build
```

**各メンバーの作業:**

```bash
# 管理者から setup/ フォルダを受け取り、インストーラを実行
cd setup && bash install-mac.sh   # macOS
# または
cd setup && powershell -ExecutionPolicy Bypass -File install-win.ps1   # Windows

# Claude Code を再起動
```

> `setup/hooks/config.json` に API URL と API Key が含まれているため、メンバーは何も入力する必要はありません。

---

### ケース 3: 既にサーバーが稼働中 — 新メンバーを追加したい

> サーバーは構築済み。新しいメンバーにフックをインストールしてもらうだけ

```bash
# 管理者から setup/ フォルダを受け取る（Git clone / 共有フォルダ / ZIP）
cd setup && bash install-mac.sh   # macOS

# Claude Code を再起動 → 完了
```

所要時間: 約1分

---

### ケース 4: プロンプトの活用状況をリアルタイムで共有したい

> チームメンバーがどんなプロンプトを送っているかをリアルタイムで確認し、ナレッジ共有に活用したい場合

ケース 2 のセットアップ完了後、ダッシュボードの **プロンプトフィード** タブを開くと、メンバーのプロンプトがカード形式でリアルタイム表示されます（15秒間隔で自動更新）。メンバー・リポジトリ・モデルでフィルタリングも可能です。

---

## セットアップ（詳細）

3ステップでセットアップが完了します。

```mermaid
graph LR
    A["Step 1<br/>初期設定<br/>(init.sh)"] --> B["Step 2<br/>サーバー起動<br/>(Docker)"]
    B --> C["Step 3<br/>各メンバーの PC に<br/>フックをインストール"]
```

### Step 1: 初期設定

`init.sh` を実行すると、対話式でサーバー設定（`server/.env`）とフック配布用設定（`setup/hooks/config.json`）を生成します。

```bash
cd claude-activity-tracker
bash init.sh
```

以下の設定が対話式に行われます:

| 設定項目 | 生成ファイル | 説明 |
|---------|-------------|------|
| DATABASE_URL, PORT, API_KEY, BASIC_AUTH_PASSWORD | `server/.env` | サーバー環境変数。API_KEY は自動生成 |
| api_url, api_key, debug | `setup/hooks/config.json` | フック配布用。api_key は .env と自動同期 |

> 既にファイルが存在する場合はスキップされます。手動で設定したい場合は `cp server/.env.example server/.env` と `cp setup/hooks/config.json.example setup/hooks/config.json` で作成してください。

### Step 2: サーバーを起動する（Docker）

```bash
cd claude-activity-tracker/server

# Docker Compose でビルド & 起動（MariaDB + API）
docker compose up -d --build
```

起動確認:
```bash
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

ブラウザで `http://<サーバーIP>:3001/` にアクセスするとダッシュボードが表示されます。

> **Docker を使わない場合**は [手動セットアップ](#手動セットアップ開発用) を参照してください。

### Step 3: 各メンバーの PC にフックをインストール

> 詳細は [setup/README.md](setup/README.md) を参照

`setup/` フォルダを各メンバーに配布し、インストーラを実行してもらいます。
`setup/hooks/config.json` に Step 1 で設定した API URL と API Key が含まれているため、メンバーは入力不要でインストールできます。

**macOS:**
```bash
cd claude-activity-tracker/setup
bash install-mac.sh
```

**Windows (PowerShell):**
```powershell
cd claude-activity-tracker\setup
powershell -ExecutionPolicy Bypass -File install-win.ps1
```

**インストール後、Claude Code を再起動してください。** 次回のセッションから自動的にデータが記録されます。

#### 配布方法

| 方法 | 手順 |
|------|------|
| Git clone | リポジトリを clone → `bash init.sh` → `setup/` ディレクトリでインストーラ実行 |
| 共有フォルダ | `setup/` フォルダを社内共有ドライブに配置 |
| ZIP 配布 | `setup/` フォルダを ZIP 圧縮して配布 |

---

## データ収集フロー

```mermaid
sequenceDiagram
    participant CC as Claude Code
    participant Hook as フックスクリプト
    participant API as API サーバー
    participant DB as データベース

    Note over CC,DB: セッション開始
    CC->>Hook: SessionStart イベント
    Hook->>API: POST /api/hook/session-start
    API->>DB: members upsert + sessions create

    Note over CC,DB: ユーザーがプロンプトを送信
    CC->>Hook: UserPromptSubmit イベント
    Hook->>API: POST /api/hook/prompt
    API->>DB: turns create

    Note over CC,DB: サブエージェント起動（Task ツール使用時）
    CC->>Hook: SubagentStart イベント
    Hook->>API: POST /api/hook/subagent-start
    API->>DB: subagents create

    CC->>Hook: SubagentStop イベント
    Hook->>API: POST /api/hook/subagent-stop
    API->>DB: subagents update + tool_uses create

    Note over CC,DB: Claude が応答を完了
    CC->>Hook: Stop イベント
    Hook->>Hook: transcript (JSONL) 完全解析
    Hook->>API: POST /api/hook/stop
    API->>DB: sessions update + tool_uses /<br/>file_changes / session_events create

    Note over CC,DB: セッション終了
    CC->>Hook: SessionEnd イベント
    Hook->>API: POST /api/hook/session-end
    API->>DB: sessions update (ended_at)
```

---

## 収集データ

```mermaid
erDiagram
    Member ||--o{ Session : "has"
    Session ||--o{ Turn : "has"
    Session ||--o{ Subagent : "has"
    Session ||--o{ ToolUse : "has"
    Session ||--o{ FileChange : "has"
    Session ||--o{ SessionEvent : "has"

    Member {
        string gitEmail "Git メール (主キー)"
        string claudeAccount "Claude アカウント"
    }
    Session {
        string sessionUuid "セッション ID"
        string model "使用モデル"
        string gitRepo "リポジトリ"
        int totalInputTokens "入力トークン"
        int totalOutputTokens "出力トークン"
        float estimatedCost "推定コスト (USD)"
        int turnCount "ターン数"
        int toolUseCount "ツール使用数"
    }
    Turn {
        int turnNumber "ターン番号"
        string promptText "プロンプト (先頭500文字)"
        int durationMs "応答時間"
    }
    Subagent {
        string agentType "種別 (Bash, Explore, etc.)"
        string agentModel "使用モデル"
        int durationSeconds "所要時間"
        float estimatedCost "推定コスト"
    }
    ToolUse {
        string toolName "ツール名"
        string toolCategory "カテゴリ"
        string status "成功/失敗"
        bool isMcp "MCP ツールか"
    }
    FileChange {
        string filePath "ファイルパス"
        string operation "操作 (read/write/edit)"
    }
```

---

## ディレクトリ構成

```
claude-activity-tracker/
├── init.sh               初期設定スクリプト（.env + config.json 生成）
├── server/               API サーバー（Express + Prisma + TypeScript）
│   ├── src/              ソースコード
│   ├── prisma/           スキーマ + シードデータ
│   ├── views/            ダッシュボード（EJS）
│   ├── public/           静的ファイル（JS）
│   ├── scripts/          テストスクリプト
│   ├── .env.example      環境変数テンプレート
│   ├── Dockerfile        Docker イメージ定義
│   └── docker-compose.yml
├── setup/                フックインストーラー（各メンバーに配布）
│   ├── hooks/            フックスクリプト（配布用）
│   │   ├── config.json.example  設定テンプレート
│   │   └── aidd-log-*.js        6種のフックスクリプト
│   ├── install-mac.sh / install-win.ps1
│   ├── uninstall-mac.sh / uninstall-win.ps1
│   └── README.md         フックインストールガイド
├── docs/                 設計ドキュメント + スクリーンショット
├── CLAUDE.md             開発者向け注意点・技術詳細
└── README.md             本ファイル
```

---

## 手動セットアップ（開発用）

Docker を使わずにローカルで開発する場合（別途 MariaDB が必要）:

```bash
cd claude-activity-tracker/server

# 依存パッケージインストール
npm install

# 環境変数を設定
cp .env.example .env
# DATABASE_URL をローカルの MariaDB に変更:
# DATABASE_URL="mysql://tracker:trackerpass@localhost:3306/claude_tracker"

# Prisma Client 生成 + DB 初期化
npx prisma generate
npx prisma db push

# テスト用データ投入（オプション）
npm run seed

# 開発サーバー起動（ホットリロード付き）
npm run dev
```

### サーバーコマンド一覧

`server/` ディレクトリ内で実行:

| カテゴリ | コマンド | 説明 |
|---------|---------|------|
| 起動 | `npm run dev` | 開発サーバー（ホットリロード） |
| 起動 | `npm run build && npm start` | 本番ビルド + 起動 |
| 起動 | `docker compose up -d --build` | Docker で起動 |
| DB | `npx prisma generate` | Prisma Client 生成 |
| DB | `npx prisma db push` | スキーマを DB に反映 |
| DB | `npx prisma studio` | DB GUI を起動 |
| DB | `npm run seed` | テスト用シードデータ投入 |
| テスト | `npm run test:api` | 全 API エンドポイントの自動テスト（24テスト） |
| ビルド | `npm run build` | TypeScript コンパイル |

### pm2 による常駐運用

```bash
npm install -g pm2
cd server
npm run build
pm2 start ecosystem.config.js

# OS 起動時に自動起動
pm2 startup && pm2 save
```

---

## 環境変数（server/.env）

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `DATABASE_URL` | 必須 | `mysql://tracker:trackerpass@db:3306/claude_tracker` | MariaDB 接続文字列 |
| `PORT` | - | `3001` | API サーバーポート |
| `API_KEY` | 本番: 必須 | なし（未設定時は認証スキップ） | Hook API + Dashboard API の認証キー。`openssl rand -hex 32` で生成。クライアント側 `config.json` の `api_key` と一致させること |
| `BASIC_AUTH_PASSWORD` | - | なし（未設定時は認証なし） | ダッシュボード UI の Basic 認証パスワード。`/api/*` と `/health` はスキップ |
| `NODE_ENV` | - | `development` | 実行環境 |
| `COST_OPUS_INPUT` | - | `15` | Opus 入力単価（$/1Mトークン） |
| `COST_OPUS_OUTPUT` | - | `75` | Opus 出力単価 |
| `COST_SONNET_INPUT` | - | `3` | Sonnet 入力単価 |
| `COST_SONNET_OUTPUT` | - | `15` | Sonnet 出力単価 |
| `COST_HAIKU_INPUT` | - | `0.80` | Haiku 入力単価 |
| `COST_HAIKU_OUTPUT` | - | `4` | Haiku 出力単価 |

---

## セキュリティ

本システムは以下の認証機構を提供しています。

| レイヤー | 対象 | 認証方式 | 設定 |
|---------|------|---------|------|
| Hook API | `/api/hook/*` | API キー (`X-API-Key` ヘッダー) | `API_KEY` |
| Dashboard API | `/api/dashboard/*` | API キー (`X-API-Key` ヘッダー) | `API_KEY` |
| ダッシュボード UI | `/` (HTML) | Basic 認証 | `BASIC_AUTH_PASSWORD` |
| ヘルスチェック | `/health` | 認証なし | - |

### 認証フロー

```
ブラウザ → Basic 認証 → ダッシュボード HTML
  ↓
フロントエンド JS → X-API-Key ヘッダー → Dashboard API
  ↓
フックスクリプト → X-API-Key ヘッダー → Hook API
```

- `API_KEY` を設定すると、Hook API と Dashboard API の両方が保護されます
- `BASIC_AUTH_PASSWORD` を設定すると、ダッシュボード画面へのアクセスが保護されます
- フロントエンド JS にはサーバーサイドから API キーが自動的に渡されます

> **本番環境では `API_KEY` と `BASIC_AUTH_PASSWORD` の両方を設定してください。**
> HTTPS の設定やファイアウォールなど、ネットワークレベルのセキュリティは運用環境に応じて各自で設定してください。

---

## トラブルシューティング

### .env を変更したのに反映されない

Docker Compose では `docker compose restart` は `.env` を再読込しません。

```bash
# .env の変更を反映するにはコンテナを再作成する
docker compose up -d --force-recreate
```

### Hook API が 401 Unauthorized を返す

サーバー側 `.env` の `API_KEY` とクライアント側 `~/.claude/hooks/config.json` の `api_key` が一致しているか確認してください。

```bash
# サーバー側
grep API_KEY server/.env

# クライアント側
cat ~/.claude/hooks/config.json | grep api_key
```

### サーバーが起動しない

```bash
# ポートが使用中か確認
lsof -i:3001

# Docker の場合
docker compose logs api

# Prisma Client が生成済みか確認
ls server/node_modules/@prisma/client

# 再生成
cd server && npx prisma generate
```

### フックのデータが記録されない

```bash
# 1. サーバーの稼働確認
curl http://<サーバーIP>:3001/health

# 2. フックのデバッグログ確認（config.json で debug: true 設定時）
cat ~/.claude/hooks/debug.log

# 3. settings.json にフックが登録されているか確認
cat ~/.claude/settings.json

# 4. config.json の api_url を確認
cat ~/.claude/hooks/config.json

# 5. フックの手動テスト
echo '{"session_id":"test","prompt":"test","model":"test"}' | node ~/.claude/hooks/aidd-log-session-start.js
```

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [setup/README.md](setup/README.md) | フックインストールガイド（各メンバー向け） |
| [CLAUDE.md](CLAUDE.md) | 開発者向け技術詳細・注意点 |
| [docs/database-design.md](docs/database-design.md) | データベース設計 |
| [docs/hook-data-reference.md](docs/hook-data-reference.md) | フックデータリファレンス |
| [docs/dashboard-design.md](docs/dashboard-design.md) | ダッシュボード設計 |
| [docs/ai-productivity-kpi-report.md](docs/ai-productivity-kpi-report.md) | AI駆動開発 生産性KPI企画書 |
