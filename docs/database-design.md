# Claude Code Activity Tracker - Database Design

> GAS/Spreadsheet を廃止し、リレーショナル DB に移行する設計書
> フック → Node.js API → DB の構成で、サブエージェント・ツール使用・セッションライフサイクルを完全追跡

---

## 1. 設計方針

### 1.1 現行アーキテクチャの課題

```
現行: Hook (Node.js) → GAS → Spreadsheet（1テーブル、15カラム、フラット構造）
```

- サブエージェントの追跡不可
- ツール個別の使用履歴なし
- セッションのライフサイクル（開始〜終了）が不完全
- リレーションがないため分析が困難

### 1.2 新アーキテクチャ

```
新: Hook (Node.js) → Node.js API サーバー（直接POST） → MySQL（リレーショナル）
```

- フックも API サーバーも Node.js で統一（技術スタック簡素化）
- 各フックが API エンドポイントに直接 POST
- リレーショナル構造で多角的な分析が可能
- サブエージェントの親子関係を追跡
- トランスクリプト JSONL の深い解析

### 1.3 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| API サーバー | **Express** | 軽量、エコシステム豊富 |
| ORM | **Prisma** | 型安全、マイグレーション管理、リレーション操作が容易 |
| DB | **MySQL** (本番) / **SQLite** (開発) | Prisma で切替可能 |
| ダッシュボード | **EJS** or **React** + **Chart.js** | 既存実装を活用可能 |
| プロセス管理 | **pm2** | Node.js デーモン化、ログ管理 |

### 1.4 使用するフック（6種）

| フック | 役割 | API エンドポイント |
|--------|------|-------------------|
| **SessionStart** | セッション作成 | `POST /api/hook/session-start` |
| **UserPromptSubmit** | ターン記録 | `POST /api/hook/prompt` |
| **SubagentStart** | サブエージェント開始記録 | `POST /api/hook/subagent-start` |
| **SubagentStop** | サブエージェント終了 + トランスクリプト解析 | `POST /api/hook/subagent-stop` |
| **Stop** | メイン応答完了 + トランスクリプト解析 | `POST /api/hook/stop` |
| **SessionEnd** | セッション終了 | `POST /api/hook/session-end` |

---

## 2. データフロー

### 2.1 フック発火順序とデータ収集

```mermaid
sequenceDiagram
    participant U as User
    participant CC as Claude Code
    participant H as Hooks (Node.js)
    participant API as Node.js API Server
    participant DB as MySQL

    Note over CC: セッション開始
    CC->>H: SessionStart
    H->>API: POST /api/hook/session-start
    API->>DB: INSERT sessions

    loop 各プロンプト
        U->>CC: プロンプト入力
        CC->>H: UserPromptSubmit
        H->>API: POST /api/hook/prompt
        API->>DB: INSERT turns

        Note over CC: Claude が応答生成

        opt サブエージェント使用時
            CC->>H: SubagentStart
            H->>API: POST /api/hook/subagent-start
            API->>DB: INSERT subagents

            Note over CC: サブエージェント作業中

            CC->>H: SubagentStop
            H-->>H: サブエージェントtranscript解析
            H->>API: POST /api/hook/subagent-stop
            API->>DB: UPDATE subagents + INSERT tool_uses
        end

        CC->>H: Stop
        H-->>H: メインtranscript解析
        H->>API: POST /api/hook/stop
        API->>DB: UPDATE sessions, INSERT tool_uses, file_changes, session_events
    end

    Note over CC: セッション終了
    CC->>H: SessionEnd
    H->>API: POST /api/hook/session-end
    API->>DB: UPDATE sessions (end_reason, ended_at)
```

### 2.2 システム構成図

```mermaid
flowchart TB
    subgraph Clients["各メンバーの PC (Mac/Win)"]
        CC1["Claude Code<br/>+ Hooks (Node.js)"]
        CC2["Claude Code<br/>+ Hooks (Node.js)"]
        CC3["Claude Code<br/>+ Hooks (Node.js)"]
    end

    subgraph Server["サーバー (Node.js)"]
        API["Express API<br/>POST /api/hook/*"]
        ORM["Prisma ORM"]
        DASH["ダッシュボード<br/>(EJS + Chart.js)"]
    end

    subgraph Storage["データベース"]
        DB[(MySQL)]
    end

    CC1 -->|HTTPS POST| API
    CC2 -->|HTTPS POST| API
    CC3 -->|HTTPS POST| API
    API --> ORM
    ORM --> DB
    DASH --> ORM
    DB --> DASH
```

### 2.3 各フックが送信するデータ

```mermaid
flowchart LR
    subgraph Hooks["フック（Node.js）"]
        SS[SessionStart]
        UP[UserPromptSubmit]
        SAS[SubagentStart]
        SAST[SubagentStop]
        ST[Stop]
        SE[SessionEnd]
    end

    subgraph SSData["SessionStart データ"]
        SS1[session_id]
        SS2[model]
        SS3[source]
        SS4[permission_mode]
        SS5[cwd]
        SS6[git_repo / branch / user]
        SS7[claude_account]
        SS8[ip_address]
    end

    subgraph UPData["UserPromptSubmit データ"]
        UP1[session_id]
        UP2[prompt]
        UP3[submitted_at]
    end

    subgraph SASData["SubagentStart データ"]
        SAS1[session_id]
        SAS2[agent_id]
        SAS3[agent_type]
    end

    subgraph SASTData["SubagentStop データ"]
        SAST1[session_id]
        SAST2[agent_id]
        SAST3[agent_type]
        SAST4["agent_transcript 解析結果"]
        SAST5["→ tokens, tool_uses"]
    end

    subgraph STData["Stop トランスクリプト解析"]
        ST1["token集計 (usage)"]
        ST2["tool_use ブロック一覧"]
        ST3["turn_duration 一覧"]
        ST4["compact_boundary"]
        ST5["file-history-snapshot"]
        ST6["summary"]
    end

    subgraph SEData["SessionEnd データ"]
        SE1[session_id]
        SE2[reason]
    end

    SS --> SSData
    UP --> UPData
    SAS --> SASData
    SAST --> SASTData
    ST --> STData
    SE --> SEData
```

---

## 3. ER 図

```mermaid
erDiagram
    members {
        bigint id PK
        varchar claude_account UK "Claudeメール"
        varchar git_email "Gitメール"
        varchar display_name "表示名"
        timestamp created_at
        timestamp updated_at
    }

    sessions {
        bigint id PK
        bigint member_id FK "members.id"
        varchar session_uuid UK "セッションUUID"
        varchar model "使用モデル"
        varchar source "startup/resume/clear/compact"
        varchar permission_mode "権限モード"
        varchar cwd "作業ディレクトリ"
        varchar git_repo "リポジトリURL"
        varchar git_branch "ブランチ名"
        varchar ip_address "IPアドレス"
        timestamp started_at "開始時刻"
        timestamp ended_at "終了時刻"
        varchar end_reason "終了理由"
        int total_input_tokens "入力トークン合計"
        int total_output_tokens "出力トークン合計"
        int total_cache_creation_tokens "キャッシュ作成トークン"
        int total_cache_read_tokens "キャッシュ読取トークン"
        decimal estimated_cost "推定コスト(USD)"
        int turn_count "ターン数"
        int tool_use_count "ツール使用回数"
        int subagent_count "サブエージェント数"
        int compact_count "コンテキスト圧縮回数"
        int error_count "エラー回数"
        text summary "セッション要約"
        timestamp created_at
        timestamp updated_at
    }

    turns {
        bigint id PK
        bigint session_id FK "sessions.id"
        int turn_number "ターン番号(1始まり)"
        text prompt_text "プロンプト(先頭500文字)"
        timestamp prompt_submitted_at "送信時刻"
        timestamp response_completed_at "応答完了時刻"
        int duration_ms "応答所要時間(ms)"
        int input_tokens "入力トークン"
        int output_tokens "出力トークン"
        int cache_creation_tokens "キャッシュ作成"
        int cache_read_tokens "キャッシュ読取"
        varchar model "使用モデル"
        varchar stop_reason "停止理由"
        timestamp created_at
    }

    subagents {
        bigint id PK
        bigint session_id FK "sessions.id"
        bigint turn_id FK "turns.id (発生元ターン)"
        bigint parent_tool_use_id FK "tool_uses.id (Taskツール)"
        varchar agent_uuid UK "エージェントUUID"
        varchar agent_type "Explore/Plan/Bash/general-purpose"
        varchar agent_model "使用モデル(haiku等)"
        text prompt_text "サブエージェントへの指示"
        varchar description "短い説明"
        timestamp started_at "開始時刻"
        timestamp stopped_at "終了時刻"
        int duration_seconds "所要時間(秒)"
        int input_tokens "入力トークン合計"
        int output_tokens "出力トークン合計"
        int cache_creation_tokens "キャッシュ作成"
        int cache_read_tokens "キャッシュ読取"
        decimal estimated_cost "推定コスト(USD)"
        int tool_use_count "ツール使用回数"
        timestamp created_at
    }

    tool_uses {
        bigint id PK
        bigint session_id FK "sessions.id"
        bigint turn_id FK "turns.id"
        bigint subagent_id FK "subagents.id (null=メイン)"
        varchar tool_use_uuid "ツール呼出UUID"
        varchar tool_name "ツール名"
        varchar tool_category "分類(後述)"
        text tool_input_summary "入力の要約"
        varchar status "success/failure/blocked"
        text error_message "エラー内容"
        boolean is_mcp "MCPツールか"
        varchar mcp_server "MCPサーバー名"
        timestamp executed_at "実行時刻"
        timestamp created_at
    }

    file_changes {
        bigint id PK
        bigint session_id FK "sessions.id"
        bigint turn_id FK "turns.id"
        bigint tool_use_id FK "tool_uses.id"
        varchar file_path "ファイルパス"
        varchar operation "read/write/edit/delete"
        timestamp created_at
    }

    session_events {
        bigint id PK
        bigint session_id FK "sessions.id"
        varchar event_type "compact/notification/permission/error"
        varchar event_subtype "詳細種別"
        json event_data "イベントデータ"
        timestamp occurred_at "発生時刻"
        timestamp created_at
    }

    members ||--o{ sessions : "has many"
    sessions ||--o{ turns : "has many"
    sessions ||--o{ subagents : "has many"
    sessions ||--o{ tool_uses : "has many"
    sessions ||--o{ file_changes : "has many"
    sessions ||--o{ session_events : "has many"
    turns ||--o{ tool_uses : "has many"
    turns ||--o{ subagents : "spawns"
    turns ||--o{ file_changes : "has many"
    subagents ||--o{ tool_uses : "has many"
    tool_uses ||--o{ file_changes : "triggers"
    tool_uses ||--o| subagents : "parent Task tool"
```

---

## 4. Prisma スキーマ

```prisma
// schema.prisma
datasource db {
  provider = "mysql"    // 開発時は "sqlite" に切替可能
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Member {
  id             Int       @id @default(autoincrement())
  claudeAccount  String    @unique @map("claude_account")
  gitEmail       String?   @map("git_email")
  displayName    String?   @map("display_name")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  sessions       Session[]

  @@map("members")
}

model Session {
  id                      Int       @id @default(autoincrement())
  memberId                Int?      @map("member_id")
  sessionUuid             String    @unique @map("session_uuid")
  model                   String?
  source                  String?   // startup, resume, clear, compact
  permissionMode          String?   @map("permission_mode")
  cwd                     String?
  gitRepo                 String?   @map("git_repo")
  gitBranch               String?   @map("git_branch")
  ipAddress               String?   @map("ip_address")
  startedAt               DateTime? @map("started_at")
  endedAt                 DateTime? @map("ended_at")
  endReason               String?   @map("end_reason")
  totalInputTokens        Int       @default(0) @map("total_input_tokens")
  totalOutputTokens       Int       @default(0) @map("total_output_tokens")
  totalCacheCreationTokens Int      @default(0) @map("total_cache_creation_tokens")
  totalCacheReadTokens    Int       @default(0) @map("total_cache_read_tokens")
  estimatedCost           Decimal?  @map("estimated_cost") @db.Decimal(10, 4)
  turnCount               Int       @default(0) @map("turn_count")
  toolUseCount            Int       @default(0) @map("tool_use_count")
  subagentCount           Int       @default(0) @map("subagent_count")
  compactCount            Int       @default(0) @map("compact_count")
  errorCount              Int       @default(0) @map("error_count")
  summary                 String?   @db.Text
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  member        Member?         @relation(fields: [memberId], references: [id])
  turns         Turn[]
  subagents     Subagent[]
  toolUses      ToolUse[]
  fileChanges   FileChange[]
  sessionEvents SessionEvent[]

  @@index([memberId])
  @@index([startedAt])
  @@index([model])
  @@index([gitRepo])
  @@map("sessions")
}

model Turn {
  id                   Int       @id @default(autoincrement())
  sessionId            Int       @map("session_id")
  turnNumber           Int       @map("turn_number")
  promptText           String?   @map("prompt_text") @db.Text
  promptSubmittedAt    DateTime? @map("prompt_submitted_at")
  responseCompletedAt  DateTime? @map("response_completed_at")
  durationMs           Int?      @map("duration_ms")
  inputTokens          Int       @default(0) @map("input_tokens")
  outputTokens         Int       @default(0) @map("output_tokens")
  cacheCreationTokens  Int       @default(0) @map("cache_creation_tokens")
  cacheReadTokens      Int       @default(0) @map("cache_read_tokens")
  model                String?
  stopReason           String?   @map("stop_reason")
  createdAt            DateTime  @default(now()) @map("created_at")

  session     Session     @relation(fields: [sessionId], references: [id])
  toolUses    ToolUse[]
  subagents   Subagent[]
  fileChanges FileChange[]

  @@index([sessionId])
  @@index([promptSubmittedAt])
  @@map("turns")
}

model Subagent {
  id                   Int       @id @default(autoincrement())
  sessionId            Int       @map("session_id")
  turnId               Int?      @map("turn_id")
  parentToolUseId      Int?      @map("parent_tool_use_id")
  agentUuid            String    @unique @map("agent_uuid")
  agentType            String    @map("agent_type")
  agentModel           String?   @map("agent_model")
  promptText           String?   @map("prompt_text") @db.Text
  description          String?
  startedAt            DateTime? @map("started_at")
  stoppedAt            DateTime? @map("stopped_at")
  durationSeconds      Int?      @map("duration_seconds")
  inputTokens          Int       @default(0) @map("input_tokens")
  outputTokens         Int       @default(0) @map("output_tokens")
  cacheCreationTokens  Int       @default(0) @map("cache_creation_tokens")
  cacheReadTokens      Int       @default(0) @map("cache_read_tokens")
  estimatedCost        Decimal?  @map("estimated_cost") @db.Decimal(10, 4)
  toolUseCount         Int       @default(0) @map("tool_use_count")
  createdAt            DateTime  @default(now()) @map("created_at")

  session       Session   @relation(fields: [sessionId], references: [id])
  turn          Turn?     @relation(fields: [turnId], references: [id])
  parentToolUse ToolUse?  @relation("SubagentParent", fields: [parentToolUseId], references: [id])
  toolUses      ToolUse[] @relation("SubagentToolUses")

  @@index([sessionId])
  @@index([turnId])
  @@index([agentType])
  @@index([startedAt])
  @@map("subagents")
}

model ToolUse {
  id               Int       @id @default(autoincrement())
  sessionId        Int       @map("session_id")
  turnId           Int?      @map("turn_id")
  subagentId       Int?      @map("subagent_id")
  toolUseUuid      String?   @map("tool_use_uuid")
  toolName         String    @map("tool_name")
  toolCategory     String?   @map("tool_category")
  toolInputSummary String?   @map("tool_input_summary") @db.Text
  status           String    @default("success")
  errorMessage     String?   @map("error_message") @db.Text
  isMcp            Boolean   @default(false) @map("is_mcp")
  mcpServer        String?   @map("mcp_server")
  executedAt       DateTime? @map("executed_at")
  createdAt        DateTime  @default(now()) @map("created_at")

  session      Session      @relation(fields: [sessionId], references: [id])
  turn         Turn?        @relation(fields: [turnId], references: [id])
  subagent     Subagent?    @relation("SubagentToolUses", fields: [subagentId], references: [id])
  childSubagents Subagent[] @relation("SubagentParent")
  fileChanges  FileChange[]

  @@index([sessionId])
  @@index([turnId])
  @@index([subagentId])
  @@index([toolName])
  @@index([toolCategory])
  @@index([status])
  @@map("tool_uses")
}

model FileChange {
  id         Int       @id @default(autoincrement())
  sessionId  Int       @map("session_id")
  turnId     Int?      @map("turn_id")
  toolUseId  Int?      @map("tool_use_id")
  filePath   String    @map("file_path")
  operation  String    // read, write, edit, delete
  createdAt  DateTime  @default(now()) @map("created_at")

  session  Session  @relation(fields: [sessionId], references: [id])
  turn     Turn?    @relation(fields: [turnId], references: [id])
  toolUse  ToolUse? @relation(fields: [toolUseId], references: [id])

  @@index([sessionId])
  @@index([filePath])
  @@map("file_changes")
}

model SessionEvent {
  id           Int       @id @default(autoincrement())
  sessionId    Int       @map("session_id")
  eventType    String    @map("event_type")
  eventSubtype String?   @map("event_subtype")
  eventData    Json?     @map("event_data")
  occurredAt   DateTime? @map("occurred_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  session Session @relation(fields: [sessionId], references: [id])

  @@index([sessionId])
  @@index([eventType])
  @@map("session_events")
}
```

---

## 5. API エンドポイント設計

### 5.1 フック受信 API（6エンドポイント）

```
POST /api/hook/session-start    → sessions INSERT
POST /api/hook/prompt           → turns INSERT
POST /api/hook/subagent-start   → subagents INSERT
POST /api/hook/subagent-stop    → subagents UPDATE + tool_uses INSERT
POST /api/hook/stop             → sessions UPDATE + tool_uses/file_changes/session_events INSERT
POST /api/hook/session-end      → sessions UPDATE
```

### 5.2 ダッシュボード API（クエリ用）

```
GET /api/dashboard/stats            → KPI 集計値
GET /api/dashboard/daily-stats      → 日別統計
GET /api/dashboard/member-stats     → メンバー別統計
GET /api/dashboard/subagent-stats   → サブエージェント統計
GET /api/dashboard/tool-stats       → ツール使用統計
GET /api/dashboard/cost-stats       → コスト統計
GET /api/dashboard/sessions         → セッション一覧（ページネーション）
GET /api/dashboard/sessions/:id     → セッション詳細（ターン・ツール・サブエージェント含む）
GET /api/dashboard/heatmap          → 時間帯別ヒートマップ
GET /api/dashboard/security         → セキュリティ関連統計
```

### 5.3 Express ルーター構成

```
server/
├── src/
│   ├── index.ts                 # エントリポイント (Express起動)
│   ├── routes/
│   │   ├── hookRoutes.ts        # POST /api/hook/* (6エンドポイント)
│   │   └── dashboardRoutes.ts   # GET /api/dashboard/* (10エンドポイント)
│   ├── services/
│   │   ├── hookService.ts       # フックデータのDB書込ロジック
│   │   ├── transcriptParser.ts  # JSONL トランスクリプト解析
│   │   ├── costCalculator.ts    # モデル別コスト算出
│   │   └── dashboardService.ts  # ダッシュボード用クエリ
│   ├── middleware/
│   │   └── auth.ts              # API キー認証
│   └── utils/
│       └── toolCategory.ts      # tool_name → tool_category 分類
├── prisma/
│   └── schema.prisma
├── views/
│   └── dashboard.ejs            # ダッシュボード画面
├── public/
│   └── js/
│       └── dashboard.js         # Chart.js グラフ描画
├── package.json
├── tsconfig.json
└── .env
```

---

## 6. テーブル詳細

### 6.1 members（メンバー）

チームメンバーの管理。Claude アカウント（メール）で一意識別。

| カラム | 型 | 説明 | データソース |
|--------|-----|------|-------------|
| id | int PK | - | 自動採番 |
| claude_account | varchar(255) UK | Claude アカウントメール | Stop hook (LevelDB/Keychain) |
| git_email | varchar(255) | Git メール | Stop hook (`git config user.email`) |
| display_name | varchar(255) | 表示名 | 手動登録 or git_email から |
| created_at | timestamp | - | 初回セッション時に自動作成 |

### 6.2 sessions（セッション）

Claude Code の1セッション = 1レコード。SessionStart で作成、Stop/SessionEnd で更新。

| カラム | 型 | データソース（フック） |
|--------|-----|----------------------|
| session_uuid | varchar(36) UK | SessionStart `session_id` |
| member_id | int FK | Stop hook で claude_account から解決 |
| model | varchar(100) | SessionStart `model` |
| source | varchar(20) | SessionStart `source` |
| permission_mode | varchar(30) | SessionStart `permission_mode` |
| cwd | varchar(500) | SessionStart `cwd` |
| git_repo | varchar(500) | Stop hook (`git remote get-url origin`) |
| git_branch | varchar(255) | Stop hook (`git branch --show-current`) |
| ip_address | varchar(45) | Stop hook (ipify API) |
| started_at | timestamp | SessionStart (フック実行時刻) |
| ended_at | timestamp | SessionEnd (フック実行時刻) |
| end_reason | varchar(50) | SessionEnd `reason` |
| total_input_tokens | int | Stop (transcript 集計) |
| total_output_tokens | int | Stop (transcript 集計) |
| total_cache_creation_tokens | int | Stop (transcript 集計) |
| total_cache_read_tokens | int | Stop (transcript 集計) |
| estimated_cost | decimal(10,4) | Stop (モデル別単価で算出) |
| turn_count | int | Stop (transcript の user エントリ数) |
| tool_use_count | int | Stop (transcript の tool_use ブロック数) |
| subagent_count | int | SubagentStart の回数集計 |
| compact_count | int | Stop (transcript の compact_boundary 数) |
| error_count | int | Stop (transcript の失敗ツール数) |
| summary | text | Stop (transcript の summary エントリ) |

### 6.3 turns（ターン）

ユーザーの1プロンプト → Claude の1応答 = 1ターン。

| カラム | 型 | データソース |
|--------|-----|-------------|
| session_id | int FK | UserPromptSubmit `session_id` で sessions を lookup |
| turn_number | int | セッション内の連番 |
| prompt_text | text | UserPromptSubmit `prompt`（先頭500文字） |
| prompt_submitted_at | timestamp | UserPromptSubmit フック実行時刻 |
| response_completed_at | timestamp | Stop フック実行時刻 |
| duration_ms | int | transcript `turn_duration` の `durationMs` |
| input_tokens | int | transcript `assistant` エントリの `usage.input_tokens` |
| output_tokens | int | transcript `assistant` エントリの `usage.output_tokens` |
| cache_creation_tokens | int | transcript `usage.cache_creation_input_tokens` |
| cache_read_tokens | int | transcript `usage.cache_read_input_tokens` |
| model | varchar(100) | transcript `assistant` エントリの `message.model` |
| stop_reason | varchar(50) | transcript `message.stop_reason` |

### 6.4 subagents（サブエージェント）

Task ツールで起動されたサブエージェントの追跡。

| カラム | 型 | データソース |
|--------|-----|-------------|
| session_id | int FK | SubagentStart `session_id` |
| turn_id | int FK | 直前の UserPromptSubmit から特定 |
| parent_tool_use_id | int FK | transcript で Task tool_use と紐付け |
| agent_uuid | varchar(36) UK | SubagentStart `agent_id` |
| agent_type | varchar(50) | SubagentStart `agent_type` |
| agent_model | varchar(100) | transcript の Task tool_input.model |
| prompt_text | text | transcript の Task tool_input.prompt（先頭500文字） |
| description | varchar(255) | transcript の Task tool_input.description |
| started_at | timestamp | SubagentStart フック実行時刻 |
| stopped_at | timestamp | SubagentStop フック実行時刻 |
| duration_seconds | int | stopped_at - started_at |
| input_tokens | int | SubagentStop: agent_transcript の usage 集計 |
| output_tokens | int | 同上 |
| cache_creation_tokens | int | 同上 |
| cache_read_tokens | int | 同上 |
| estimated_cost | decimal(10,4) | モデル別単価で算出 |
| tool_use_count | int | agent_transcript の tool_use ブロック数 |

### 6.5 tool_uses（ツール使用）

全ツール呼出の記録。メインエージェント・サブエージェント両方を含む。

| カラム | 型 | データソース |
|--------|-----|-------------|
| session_id | int FK | transcript から |
| turn_id | int FK | transcript のエントリ順序から特定 |
| subagent_id | int FK | NULL=メインエージェント、非NULL=サブエージェント内 |
| tool_use_uuid | varchar(50) | transcript `tool_use.id` |
| tool_name | varchar(100) | transcript `tool_use.name` |
| tool_category | varchar(20) | tool_name から自動分類（下表参照） |
| tool_input_summary | text | tool_input の要約（パス、コマンド等） |
| status | varchar(10) | success / failure / blocked |
| error_message | text | 失敗時のエラー内容 |
| is_mcp | boolean | tool_name が `mcp__` で始まるか |
| mcp_server | varchar(100) | `mcp__<server>__<tool>` から抽出 |
| executed_at | timestamp | transcript のタイムスタンプ |

**tool_category の自動分類:**

| tool_name | tool_category | 説明 |
|-----------|--------------|------|
| Read, Glob, Grep | `search` | ファイル検索・読取 |
| Write, Edit | `file_edit` | ファイル変更 |
| Bash | `bash` | コマンド実行 |
| Task | `subagent` | サブエージェント起動 |
| WebFetch, WebSearch | `web` | Web アクセス |
| `mcp__*` | `mcp` | MCP 外部ツール |
| その他 | `other` | 未分類 |

### 6.6 file_changes（ファイル変更）

セッション中に変更されたファイルの記録。

| カラム | 型 | データソース |
|--------|-----|-------------|
| session_id | int FK | transcript から |
| turn_id | int FK | transcript から |
| tool_use_id | int FK | Write/Edit/Bash の tool_use |
| file_path | varchar(500) | tool_input.file_path or file-history-snapshot |
| operation | varchar(10) | read / write / edit / delete |

### 6.7 session_events（セッションイベント）

セッション中の各種イベント記録。

| カラム | 型 | データソース |
|--------|-----|-------------|
| session_id | int FK | transcript から |
| event_type | varchar(30) | イベント種別（下表） |
| event_subtype | varchar(50) | 詳細種別 |
| event_data | json | イベント固有データ |
| occurred_at | timestamp | transcript のタイムスタンプ |

**event_type 一覧:**

| event_type | event_subtype 例 | event_data の内容 |
|-----------|-----------------|------------------|
| `compact` | `auto`, `manual` | `{ preTokens: 180000 }` |
| `notification` | `permission_prompt`, `idle_prompt` | `{ message: "..." }` |
| `permission_request` | ツール名 | `{ tool_name: "Bash", command: "..." }` |
| `api_error` | エラー種別 | `{ error: "..." }` |
| `stop_hook` | - | `{ hookCount: 1, preventedContinuation: false }` |

---

## 7. ダッシュボードで実現可能なビュー

### 7.1 コスト管理ダッシュボード

```mermaid
graph TB
    subgraph KPI["KPI カード"]
        K1["月間総コスト<br/>$1,234.56"]
        K2["メンバー平均コスト<br/>$154.32/人"]
        K3["サブエージェントコスト比率<br/>23%"]
        K4["キャッシュ効率<br/>67%"]
    end

    subgraph Charts["チャート"]
        C1["日別コスト推移<br/>(折れ線)"]
        C2["メンバー別コスト<br/>(横棒)"]
        C3["モデル別コスト<br/>(ドーナツ)"]
        C4["メイン vs サブエージェント<br/>コスト比較 (積み上げ棒)"]
    end
```

**クエリ例: メンバー別コスト（メイン + サブエージェント内訳）**
```sql
SELECT
    m.display_name,
    SUM(s.estimated_cost) AS total_cost,
    SUM(s.estimated_cost) - COALESCE(SUM(sa.estimated_cost), 0) AS main_cost,
    COALESCE(SUM(sa.estimated_cost), 0) AS subagent_cost
FROM sessions s
JOIN members m ON m.id = s.member_id
LEFT JOIN subagents sa ON sa.session_id = s.id
WHERE s.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY m.id, m.display_name
ORDER BY total_cost DESC;
```

### 7.2 サブエージェント活用ダッシュボード

```mermaid
graph TB
    subgraph KPI["KPI"]
        K1["サブエージェント総起動数<br/>342回/月"]
        K2["平均起動回数/セッション<br/>2.3回"]
        K3["サブエージェント平均所要時間<br/>12.5秒"]
        K4["サブエージェント総コスト<br/>$287.40"]
    end

    subgraph Charts["チャート"]
        C1["エージェント種別分布<br/>(ドーナツ)<br/>Explore 45%, Plan 20%<br/>Bash 15%, general 20%"]
        C2["メンバー別サブエージェント使用<br/>(横棒)"]
        C3["サブエージェントのプロンプト→結果<br/>(テーブル)"]
        C4["日別サブエージェント使用推移<br/>(積み上げ面)"]
    end
```

**クエリ例: サブエージェント詳細（どのプロンプトから発生したか）**
```sql
SELECT
    sa.agent_type,
    sa.description,
    sa.prompt_text AS subagent_prompt,
    t.prompt_text AS user_prompt,
    sa.duration_seconds,
    sa.input_tokens + sa.output_tokens AS total_tokens,
    sa.estimated_cost,
    sa.tool_use_count,
    m.display_name AS member
FROM subagents sa
JOIN sessions s ON s.id = sa.session_id
JOIN members m ON m.id = s.member_id
LEFT JOIN turns t ON t.id = sa.turn_id
ORDER BY sa.started_at DESC
LIMIT 50;
```

### 7.3 ツール使用分析ダッシュボード

```mermaid
graph TB
    subgraph KPI["KPI"]
        K1["総ツール呼出数<br/>8,432回/月"]
        K2["ツール成功率<br/>96.2%"]
        K3["MCP ツール使用率<br/>12%"]
        K4["平均ツール使用/セッション<br/>15.3回"]
    end

    subgraph Charts["チャート"]
        C1["ツール別使用回数<br/>(横棒トップ10)"]
        C2["カテゴリ別分布<br/>(ドーナツ)<br/>search 40%, file_edit 25%<br/>bash 20%, web 5%"]
        C3["ツールエラー率<br/>(棒+折れ線)"]
        C4["MCP ツール使用詳細<br/>(テーブル)"]
    end
```

**クエリ例: ツール使用ランキング**
```sql
SELECT
    tool_name,
    tool_category,
    COUNT(*) AS use_count,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) AS failure_count,
    ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS success_rate,
    SUM(CASE WHEN subagent_id IS NOT NULL THEN 1 ELSE 0 END) AS in_subagent_count
FROM tool_uses
WHERE executed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY tool_name, tool_category
ORDER BY use_count DESC;
```

### 7.4 生産性ダッシュボード

```mermaid
graph TB
    subgraph KPI["KPI"]
        K1["日平均セッション数<br/>12.4回"]
        K2["平均ターン数/セッション<br/>8.2回"]
        K3["平均セッション時間<br/>23分"]
        K4["コンテキスト圧縮率<br/>15% のセッションで発生"]
    end

    subgraph Charts["チャート"]
        C1["メンバー別日次セッション数<br/>(ヒートマップ)"]
        C2["時間帯別アクティビティ<br/>(バブルチャート)"]
        C3["セッション時間分布<br/>(ヒストグラム)"]
        C4["プロンプト長 vs 応答時間<br/>(散布図)"]
    end
```

### 7.5 セキュリティ・コンプライアンスダッシュボード

```mermaid
graph TB
    subgraph KPI["KPI"]
        K1["bypassPermissions<br/>使用セッション数"]
        K2["権限要求回数<br/>/月"]
        K3["外部URL<br/>アクセス数"]
        K4["異常終了<br/>セッション数"]
    end

    subgraph Charts["チャート"]
        C1["権限モード分布<br/>(ドーナツ)"]
        C2["実行コマンドログ<br/>(テーブル + 検索)"]
        C3["アクセスURL一覧<br/>(テーブル)"]
        C4["セッション終了理由<br/>(積み上げ棒)"]
    end
```

---

## 8. データ量見積もり

20名チーム、1人あたり日10セッション、1セッション平均8ターン、15ツール使用の場合：

| テーブル | 日間レコード数 | 月間レコード数 | 1レコードサイズ目安 |
|----------|--------------|---------------|-------------------|
| sessions | 200 | 6,000 | ~1KB |
| turns | 1,600 | 48,000 | ~0.5KB |
| tool_uses | 3,000 | 90,000 | ~0.3KB |
| subagents | 400 | 12,000 | ~0.5KB |
| file_changes | 1,000 | 30,000 | ~0.2KB |
| session_events | 200 | 6,000 | ~0.3KB |
| **合計** | **~6,400** | **~192,000** | **~60MB/月** |

---

## 9. マイグレーション計画（既存データ）

既存の Spreadsheet データ（フラット構造）を新 DB に移行する方針：

```mermaid
flowchart LR
    A["既存 Spreadsheet<br/>(15カラム × N行)"] --> B["Node.js Import<br/>スクリプト"]
    B --> C["sessions テーブル<br/>(session_uuid でグルーピング)"]
    B --> D["members テーブル<br/>(claude_account で一意化)"]

    E["新フック<br/>(6種)"] --> F["Node.js API<br/>(6エンドポイント)"]
    F --> G["全7テーブル<br/>(リレーショナル)"]
```

既存データは sessions + members への簡易マッピングとし、
turns / tool_uses / subagents は新フック有効化後から記録開始。

---

## 10. 環境変数 (.env)

```bash
# データベース
DATABASE_URL="mysql://user:password@localhost:3306/claude_tracker"
# 開発時は SQLite: DATABASE_URL="file:./dev.db"

# API サーバー
PORT=3000
API_KEY="your-secret-api-key"

# コスト計算（per 1M tokens）
COST_OPUS_INPUT=15
COST_OPUS_OUTPUT=75
COST_SONNET_INPUT=3
COST_SONNET_OUTPUT=15
COST_HAIKU_INPUT=0.80
COST_HAIKU_OUTPUT=4
```
