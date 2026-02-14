# Claude Code Hooks 取得可能データリファレンス

> チーム管理者向け：Claude Code の全フックイベントで取得可能なデータの完全ガイド

---

## 目次

1. [全フックイベント一覧](#1-全フックイベント一覧)
2. [各フックの詳細](#2-各フックの詳細)
3. [トランスクリプト JSONL から抽出可能なデータ](#3-トランスクリプト-jsonl-から抽出可能なデータ)
4. [管理者向け推奨メトリクス](#4-管理者向け推奨メトリクス)
5. [現在の実装状況と拡張計画](#5-現在の実装状況と拡張計画)

---

## 1. 全フックイベント一覧

Claude Code は **14 種類**のフックイベントを提供しています。

| # | フックイベント | 発火タイミング | ブロック可否 | matcher |
|---|---------------|---------------|-------------|---------|
| 1 | **SessionStart** | セッション開始/再開時 | 不可 | startup, resume, clear, compact |
| 2 | **UserPromptSubmit** | ユーザーがプロンプト送信時 | **可** | なし |
| 3 | **PreToolUse** | ツール実行前 | **可** | tool_name |
| 4 | **PostToolUse** | ツール実行成功後 | 不可 | tool_name |
| 5 | **PostToolUseFailure** | ツール実行失敗後 | 不可 | tool_name |
| 6 | **PermissionRequest** | 権限要求表示時 | **可** | tool_name |
| 7 | **SubagentStart** | サブエージェント起動時 | 不可 | agent_type |
| 8 | **SubagentStop** | サブエージェント終了時 | **可** | agent_type |
| 9 | **Notification** | 通知送信時 | 不可 | notification_type |
| 10 | **PreCompact** | コンテキスト圧縮前 | 不可 | manual, auto |
| 11 | **Stop** | メインエージェント応答完了時 | **可** | なし |
| 12 | **SessionEnd** | セッション終了時 | 不可 | reason |
| 13 | **TaskCompleted** | タスク完了時 | **可**(exit 2のみ) | なし |
| 14 | **TeammateIdle** | チームメイトアイドル時 | **可**(exit 2のみ) | なし |

---

## 2. 各フックの詳細

### 共通フィールド（全フックイベント共通）

すべてのフックは stdin 経由で以下の JSON フィールドを受け取ります。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `session_id` | string | セッション UUID |
| `transcript_path` | string | 会話トランスクリプト JSONL ファイルのパス |
| `cwd` | string | 現在の作業ディレクトリ |
| `permission_mode` | string | 権限モード: `default`, `plan`, `acceptEdits`, `dontAsk`, `bypassPermissions` |
| `hook_event_name` | string | フックイベント名 |

---

### 2.1 SessionStart

セッション開始・再開時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `source` | string | 開始種別: `startup`, `resume`, `clear`, `compact` | セッション開始パターン分析 |
| `model` | string | 使用モデル（例: `claude-opus-4-6`） | モデル使用傾向の把握 |
| `agent_type` | string? | `--agent` で起動した場合のエージェント名 | カスタムエージェント利用状況 |

```json
{
  "session_id": "abc-123",
  "source": "startup",
  "model": "claude-opus-4-6",
  "permission_mode": "default",
  "cwd": "/Users/dev/my-project"
}
```

---

### 2.2 UserPromptSubmit

ユーザーがプロンプトを送信した直後（Claude が処理する前）に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `prompt` | string | ユーザーが入力したプロンプト全文 | プロンプト品質分析、利用傾向 |

```json
{
  "session_id": "abc-123",
  "prompt": "ログイン機能にバリデーションを追加してください"
}
```

---

### 2.3 PreToolUse

Claude がツールを呼び出す直前に発火。**ツール実行をブロック可能**。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `tool_name` | string | ツール名（下表参照） | ツール使用頻度分析 |
| `tool_input` | object | ツールへの入力パラメータ | 操作内容の詳細把握 |
| `tool_use_id` | string | ツール呼出の一意ID | PostToolUse と紐付け |

**ツール名と tool_input の内容:**

| tool_name | tool_input の主要フィールド | 管理者が把握できること |
|-----------|--------------------------|----------------------|
| `Bash` | `command`, `description`, `timeout` | 実行されたシェルコマンド |
| `Read` | `file_path`, `offset`, `limit` | 読まれたファイル |
| `Write` | `file_path`, `content` | 新規作成されたファイルと内容 |
| `Edit` | `file_path`, `old_string`, `new_string` | コード変更の差分 |
| `Glob` | `pattern`, `path` | ファイル検索パターン |
| `Grep` | `pattern`, `path`, `glob` | コード検索パターン |
| `Task` | `prompt`, `description`, `subagent_type`, `model` | **サブエージェント起動の詳細** |
| `WebFetch` | `url`, `prompt` | 参照した外部URL |
| `WebSearch` | `query` | Web検索クエリ |
| `mcp__*` | (ツール依存) | MCP外部ツール利用 |

```json
{
  "session_id": "abc-123",
  "tool_name": "Task",
  "tool_input": {
    "prompt": "Search for authentication patterns in the codebase",
    "description": "Search auth patterns",
    "subagent_type": "Explore",
    "model": "haiku"
  },
  "tool_use_id": "toolu_abc123"
}
```

---

### 2.4 PostToolUse

ツールが正常に実行完了した後に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `tool_name` | string | 実行されたツール名 | ツール成功率の分析 |
| `tool_input` | object | ツールへの入力 | 実行内容の記録 |
| `tool_response` | object | ツールの実行結果 | 出力結果の監査 |
| `tool_use_id` | string | ツール呼出ID | PreToolUse と紐付け |

---

### 2.5 PostToolUseFailure

ツール実行が失敗した際に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `tool_name` | string | 失敗したツール名 | エラー傾向分析 |
| `tool_input` | object | ツールへの入力 | 失敗原因の特定 |
| `tool_use_id` | string | ツール呼出ID | - |
| `error` | string | エラー内容 | **エラーパターンの把握** |
| `is_interrupt` | boolean? | ユーザー中断によるか | 中断頻度の把握 |

---

### 2.6 PermissionRequest

権限確認ダイアログが表示される直前に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `tool_name` | string | 権限を要求するツール | 権限要求パターンの分析 |
| `tool_input` | object | ツールへの入力 | 何に対して権限が必要か |
| `permission_suggestions` | array? | 許可オプションの配列 | - |

---

### 2.7 SubagentStart

サブエージェント（Task ツール）が起動した時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `agent_id` | string | サブエージェントの一意ID | サブエージェント追跡 |
| `agent_type` | string | エージェント種別（下表参照） | **利用パターン分析** |

**agent_type の種類:**

| agent_type | 用途 | コスト目安 |
|-----------|------|----------|
| `Explore` | コードベース探索 | 低（Read系ツールのみ） |
| `Plan` | 実装計画の設計 | 低〜中 |
| `Bash` | コマンド実行 | 低 |
| `general-purpose` | 汎用タスク | 高（全ツール使用可能） |
| カスタム名 | ユーザー定義エージェント | 不定 |

---

### 2.8 SubagentStop

サブエージェントが終了した時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `agent_id` | string | サブエージェントID | Start と紐付け |
| `agent_type` | string | エージェント種別 | 種別ごとの統計 |
| `agent_transcript_path` | string | サブエージェント専用の JSONL | **サブエージェントのトークン消費量** |
| `stop_hook_active` | boolean | ストップフックで継続中か | ループ検知 |

```json
{
  "session_id": "abc-123",
  "agent_id": "def-456",
  "agent_type": "Explore",
  "agent_transcript_path": "~/.claude/projects/.../abc-123/subagents/agent-def-456.jsonl"
}
```

> **重要**: `agent_transcript_path` のJSONLを解析すれば、サブエージェントの
> トークン消費量・ツール使用回数・所要時間を個別に計測できます。

---

### 2.9 Notification

Claude Code が通知を送信する際に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `message` | string | 通知メッセージ | 通知内容の監査 |
| `title` | string? | 通知タイトル | - |
| `notification_type` | string | 種別: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` | 通知頻度の分析 |

---

### 2.10 PreCompact

コンテキストウィンドウの圧縮（コンパクション）前に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `trigger` | string | `manual`（/compact）or `auto`（自動） | **コンテキスト使い切り頻度** |
| `custom_instructions` | string | 手動時のユーザー指示 | - |

> **管理者視点**: auto が多い = セッションが長く複雑 = コスト増加の兆候

---

### 2.11 Stop

メインの Claude エージェントが応答を完了した時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `stop_hook_active` | boolean | 前回の Stop フックで継続中か | ループ防止 |

> **現在の実装**: このフックでトランスクリプトを解析し、トークン数・コスト等を算出して GAS に POST。

---

### 2.12 SessionEnd

セッションが終了した時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `reason` | string | 終了理由（下表参照） | **異常終了の監視** |

**reason の種類:**

| reason | 意味 | 管理者の着目点 |
|--------|------|---------------|
| `prompt_input_exit` | ユーザーが正常終了 | 通常 |
| `clear` | `/clear` でセッションクリア | - |
| `logout` | ログアウト | アカウント問題の可能性 |
| `bypass_permissions_disabled` | バイパス権限が無効化 | **セキュリティ関連** |
| `other` | その他 | 調査が必要 |

---

### 2.13 TaskCompleted

タスク（TodoList）が完了としてマークされた時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `task_id` | string | タスクID | タスク追跡 |
| `task_subject` | string | タスクタイトル | 作業内容の把握 |
| `task_description` | string? | タスク詳細 | 詳細な作業内容 |
| `teammate_name` | string? | 完了したチームメイト名 | チーム作業の分析 |
| `team_name` | string? | チーム名 | - |

---

### 2.14 TeammateIdle

エージェントチームのメンバーがアイドル状態になる時に発火。

| フィールド | 型 | 説明 | 管理者活用 |
|-----------|-----|------|-----------|
| `teammate_name` | string | アイドルになるメンバー名 | チーム稼働率の分析 |
| `team_name` | string | チーム名 | - |

---

## 3. トランスクリプト JSONL から抽出可能なデータ

`transcript_path` で参照される JSONL ファイルには、セッションの全会話記録が含まれます。

### 3.1 エントリタイプ一覧

| type | 説明 | 含まれるデータ |
|------|------|---------------|
| `user` | ユーザーメッセージ | プロンプト、ツール結果 |
| `assistant` | Claude の応答 | テキスト、ツール呼出、**トークン使用量**、思考内容 |
| `system` | システムイベント | **ターン所要時間**、圧縮情報、フック実行結果 |
| `summary` | セッション要約 | 自動生成されたサマリー |
| `progress` | ツール進捗 | MCP ツール等の進捗状況 |
| `file-history-snapshot` | ファイル履歴 | 変更されたファイルのバックアップ情報 |
| `queue-operation` | キュー操作 | キューに入ったプロンプト |

### 3.2 assistant エントリのトークン使用量

```json
{
  "type": "assistant",
  "message": {
    "model": "claude-opus-4-6",
    "usage": {
      "input_tokens": 1500,
      "output_tokens": 800,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 12000,
      "service_tier": "standard"
    },
    "content": [
      { "type": "thinking", "thinking": "..." },
      { "type": "text", "text": "..." },
      { "type": "tool_use", "id": "toolu_...", "name": "Edit", "input": {...} }
    ]
  }
}
```

### 3.3 system エントリのターン所要時間

```json
{
  "type": "system",
  "subtype": "turn_duration",
  "durationMs": 15234
}
```

### 3.4 system エントリのコンテキスト圧縮

```json
{
  "type": "system",
  "subtype": "compact_boundary",
  "compactMetadata": {
    "trigger": "auto",
    "preTokens": 180000
  }
}
```

### 3.5 content ブロックから抽出可能なデータ

| ブロックタイプ | 抽出可能なデータ | 管理者活用 |
|--------------|----------------|-----------|
| `thinking` | Claude の思考プロセス全文 | 推論品質の監査 |
| `text` | Claude のテキスト応答 | 出力品質の確認 |
| `tool_use` | ツール名 + 入力パラメータ | **全ツール使用履歴** |

---

## 4. 管理者向け推奨メトリクス

### 4.1 コスト管理

| メトリクス | データソース | 算出方法 |
|-----------|-------------|---------|
| セッション別コスト | transcript `usage` | モデル別単価 × トークン数 |
| メンバー別月間コスト | 上記の集計 | ユーザー × 期間で集計 |
| サブエージェントコスト | SubagentStop + transcript | サブエージェントJSONLのトークン集計 |
| モデル使用比率 | SessionStart `model` | Opus / Sonnet / Haiku の比率 |
| キャッシュ効率 | transcript `usage` | cache_read / total_input の比率 |

**モデル別コスト単価（per 1M tokens）:**

| モデル | Input | Output | Cache Write | Cache Read |
|--------|-------|--------|-------------|------------|
| Opus 4 | $15 | $75 | $18.75 | $1.50 |
| Sonnet 4.5 | $3 | $15 | $3.75 | $0.30 |
| Haiku 4.5 | $0.80 | $4 | $1.00 | $0.08 |

### 4.2 生産性分析

| メトリクス | データソース | 意味 |
|-----------|-------------|------|
| セッション数/日 | SessionStart | 利用頻度 |
| ターン数/セッション | transcript user/assistant 数 | セッションの複雑さ |
| 平均応答時間 | `turn_duration` | Claude の応答速度 |
| プロンプト長（平均） | UserPromptSubmit `prompt` | プロンプトの質・詳細度 |
| セッション継続時間 | SessionStart 〜 SessionEnd | 作業時間の把握 |
| コンテキスト圧縮回数 | PreCompact | セッションの長さ指標 |

### 4.3 サブエージェント活用度

| メトリクス | データソース | 意味 |
|-----------|-------------|------|
| サブエージェント起動回数 | SubagentStart | Task ツールの利用頻度 |
| エージェント種別分布 | SubagentStart `agent_type` | Explore/Plan/Bash/general-purpose の比率 |
| サブエージェントトークン消費 | SubagentStop `agent_transcript_path` | サブエージェントのコスト |
| サブエージェントモデル選択 | PreToolUse (Task) `tool_input.model` | haiku/sonnet/opus の使い分け |
| メイン対サブ比率 | 全トークン中のサブエージェント割合 | 委任効率 |

### 4.4 ツール活用分析

| メトリクス | データソース | 意味 |
|-----------|-------------|------|
| ツール別使用回数 | PreToolUse / PostToolUse | どのツールが多用されているか |
| ツールエラー率 | PostToolUseFailure / PostToolUse | ツール失敗の頻度 |
| Bash コマンド履歴 | PreToolUse (Bash) `tool_input.command` | 実行コマンドの監査 |
| ファイル操作数 | PreToolUse (Write/Edit/Read) | コード変更量 |
| Web 検索回数 | PreToolUse (WebSearch/WebFetch) | 外部情報参照頻度 |
| MCP ツール使用 | PreToolUse (mcp__*) | GitHub/Slack 等の外部連携 |
| 権限要求回数 | PermissionRequest | セキュリティ関連操作の頻度 |

### 4.5 セキュリティ・コンプライアンス

| メトリクス | データソース | 意味 |
|-----------|-------------|------|
| 権限モード分布 | 全フック `permission_mode` | bypassPermissions の使用を監視 |
| 権限要求されたツール | PermissionRequest `tool_name` | 危険な操作の頻度 |
| セッション終了理由 | SessionEnd `reason` | 異常終了の監視 |
| 実行コマンドの監査 | PreToolUse (Bash) | 危険なコマンドの検出 |
| アクセスしたURL | PreToolUse (WebFetch) `url` | 外部通信の監査 |

---

## 5. 現在の実装状況と拡張計画

### 5.1 現在取得中のデータ（★ = 実装済み）

| データ | フック | ステータス |
|--------|--------|-----------|
| タイムスタンプ | Stop | ★ |
| セッションID | Stop | ★ |
| Claude アカウント | Stop | ★ |
| Git ユーザー | Stop | ★ |
| Git リポジトリ | Stop | ★ |
| Git ブランチ | Stop | ★ |
| モデル名 | SessionStart → Stop | ★ |
| 入力トークン | Stop (transcript) | ★ |
| 出力トークン | Stop (transcript) | ★ |
| キャッシュ作成トークン | Stop (transcript) | ★ |
| キャッシュ読取トークン | Stop (transcript) | ★ |
| 合計入力トークン | Stop (transcript) | ★ |
| プロンプト | UserPromptSubmit → Stop | ★ |
| 所要時間（秒） | UserPromptSubmit → Stop | ★ |
| IP アドレス | Stop | ★ |

### 5.2 拡張候補（優先度順）

#### 優先度 A（高）: コスト管理・サブエージェント

| データ | 必要なフック | 追加方法 |
|--------|-------------|---------|
| サブエージェント起動回数 | SubagentStart | 新フック追加 |
| サブエージェント種別 | SubagentStart | agent_type を記録 |
| サブエージェントトークン | SubagentStop | agent_transcript_path を解析 |
| ツール別使用回数 | Stop (transcript解析拡張) | content の tool_use を集計 |
| ターン数 | Stop (transcript解析拡張) | user/assistant エントリを数える |
| コンテキスト圧縮回数 | Stop (transcript解析拡張) | compact_boundary を数える |

#### 優先度 B（中）: 品質・生産性

| データ | 必要なフック | 追加方法 |
|--------|-------------|---------|
| セッション終了理由 | SessionEnd | 新フック追加 |
| ツールエラー回数 | Stop (transcript解析拡張) | PostToolUseFailure を数える |
| 平均ターン所要時間 | Stop (transcript解析拡張) | turn_duration の平均 |
| 権限モード | SessionStart / Stop | permission_mode を記録 |
| セッション開始種別 | SessionStart | source を記録 |

#### 優先度 C（低）: 監査・セキュリティ

| データ | 必要なフック | 追加方法 |
|--------|-------------|---------|
| Bash コマンド履歴 | PreToolUse (matcher: Bash) | 新フック追加 |
| アクセスURL一覧 | PreToolUse (matcher: WebFetch) | 新フック追加 |
| MCP ツール使用 | PreToolUse (matcher: mcp__*) | 新フック追加 |
| 権限要求イベント | PermissionRequest | 新フック追加 |

---

## 付録: settings.json フック設定例

全フックを有効にした場合の設定例：

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-session-start.js\"", "timeout": 10 }]
    }],
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-prompt.js\"", "timeout": 10 }]
    }],
    "SubagentStart": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-subagent.js\"", "timeout": 10 }]
    }],
    "SubagentStop": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-subagent-stop.js\"", "timeout": 15 }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-stop.js\"", "timeout": 30 }]
    }],
    "SessionEnd": [{
      "matcher": "",
      "hooks": [{ "type": "command", "command": "node \"/path/to/hooks/aidd-log-session-end.js\"", "timeout": 10 }]
    }]
  }
}
```

---

## 付録: データフロー図

```
┌─────────────────────────────────────────────────────┐
│                    Claude Code                       │
│                                                      │
│  SessionStart ──→ [aidd-log-session-start.js]         │
│       │               ↓ model, source, session_id    │
│       ↓                                              │
│  UserPromptSubmit ──→ [aidd-log-prompt.js]            │
│       │               ↓ prompt, start_time           │
│       ↓                                              │
│  PreToolUse ──→ (将来) tool_name, tool_input         │
│  PostToolUse                                         │
│  PostToolUseFailure                                  │
│       │                                              │
│  SubagentStart ──→ [aidd-log-subagent.js] (将来)      │
│  SubagentStop ──→   ↓ agent_type, agent_transcript   │
│       │                                              │
│  Stop ──→ [aidd-log-stop.js]                          │
│       │     ↓ transcript解析 → tokens, tools, turns  │
│       │     ↓ GAS POST                               │
│       ↓                                              │
│  SessionEnd ──→ [aidd-log-session-end.js] (将来)      │
│                 ↓ reason, total_session_time          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ↓ HTTPS POST
              ┌────────────────┐
              │  GAS Web App   │
              │       ↓        │
              │  Spreadsheet   │
              └───────┬────────┘
                      │
                      ↓ API import (15分毎)
              ┌────────────────┐
              │    Laravel     │
              │   Dashboard    │
              └────────────────┘
```
