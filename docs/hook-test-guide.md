# Hook動作テストガイド

## 前提条件

```bash
# 1. サーバー起動
cd claude-activity-tracker/server
npx tsx src/index.ts

# 2. サーバー稼働確認
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}
```

## テスト方法

Claude Code でこのプロジェクト（`採用/`）を開き、以下のプロンプトを順に実行してください。
各フックは自動的に発火します。

---

### テスト1: セッション開始（SessionStart）

Claude Code を起動するだけで `SessionStart` フックが発火します。

**確認方法:**
```bash
# debug.log を確認
tail -20 claude-activity-tracker/setup/hooks/debug.log

# DB確認
cd claude-activity-tracker/server
sqlite3 prisma/dev.db "SELECT id, session_uuid, model, git_repo FROM sessions ORDER BY id DESC LIMIT 5;"
sqlite3 prisma/dev.db "SELECT id, claude_account, display_name FROM members;"
```

---

### テスト2: プロンプト送信（UserPromptSubmit）

何でもよいのでプロンプトを送ります。

**テストプロンプト例:**
```
Hello, this is a test prompt.
```

**確認方法:**
```bash
sqlite3 prisma/dev.db "SELECT id, session_id, turn_number, prompt_text FROM turns ORDER BY id DESC LIMIT 5;"
```

---

### テスト3: サブエージェント（SubagentStart + SubagentStop）

サブエージェントを起動するプロンプトを送ります。

**テストプロンプト例:**
```
このプロジェクトの README.md の内容を要約してください。（Taskツールを使って調査してください）
```

または：
```
claude-activity-tracker ディレクトリの構成を調べて一覧にしてください。
```

**確認方法:**
```bash
sqlite3 prisma/dev.db "SELECT id, agent_uuid, agent_type, started_at, stopped_at FROM subagents ORDER BY id DESC LIMIT 5;"
```

---

### テスト4: ツール使用（Stop で記録）

ファイル読み書きやBash実行を含むプロンプトを送ります。

**テストプロンプト例:**
```
claude-activity-tracker/server/package.json を読んで、依存パッケージの一覧を表示してください。
```

```
claude-activity-tracker/server ディレクトリで ls -la を実行してください。
```

```
claude-activity-tracker/docs/hook-test-guide.md の先頭10行を表示してください。
```

**確認方法:**
```bash
sqlite3 prisma/dev.db "SELECT tool_name, tool_category, status, tool_input_summary FROM tool_uses ORDER BY id DESC LIMIT 10;"
```

---

### テスト5: ファイル変更（Stop で記録）

ファイルを編集するプロンプトを送ります。

**テストプロンプト例:**
```
claude-activity-tracker/docs/hook-test-guide.md の末尾に「テスト実行日: YYYY-MM-DD」という行を追加してください。
```

**確認方法:**
```bash
sqlite3 prisma/dev.db "SELECT file_path, operation FROM file_changes ORDER BY id DESC LIMIT 5;"
```

---

### テスト6: セッション終了（SessionEnd）

Claude Code のセッションを終了します。

- `/exit` コマンドを実行
- または Ctrl+C でセッション終了

**確認方法:**
```bash
sqlite3 prisma/dev.db "SELECT id, session_uuid, ended_at, end_reason FROM sessions ORDER BY id DESC LIMIT 5;"
```

---

## 一括確認コマンド

全テーブルのレコード数を確認:

```bash
cd claude-activity-tracker/server
sqlite3 prisma/dev.db "
SELECT 'members' as tbl, COUNT(*) as cnt FROM members
UNION ALL SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'turns', COUNT(*) FROM turns
UNION ALL SELECT 'subagents', COUNT(*) FROM subagents
UNION ALL SELECT 'tool_uses', COUNT(*) FROM tool_uses
UNION ALL SELECT 'file_changes', COUNT(*) FROM file_changes
UNION ALL SELECT 'session_events', COUNT(*) FROM session_events;
"
```

直近のセッション詳細をAPI経由で確認:

```bash
# セッション一覧
curl -s http://localhost:3001/api/dashboard/sessions | python3 -m json.tool

# 特定セッションの詳細（IDを指定）
curl -s http://localhost:3001/api/dashboard/sessions/1 | python3 -m json.tool

# ダッシュボード統計
curl -s http://localhost:3001/api/dashboard/stats | python3 -m json.tool

# フィルターオプション
curl -s http://localhost:3001/api/dashboard/filters | python3 -m json.tool
```

ブラウザで確認:

```
http://localhost:3001/
```

---

## debug.log の見方

```bash
tail -f claude-activity-tracker/setup/hooks/debug.log
```

正常時のログ例:
```
[2026-02-13T09:00:00.000Z] [SessionStart] --- Hook started ---
[2026-02-13T09:00:00.010Z] [SessionStart] stdin: {"session_id":"abc-123",...}
[2026-02-13T09:00:00.200Z] [SessionStart] payload: {"session_uuid":"abc-123",...}
[2026-02-13T09:00:00.201Z] [SessionStart] postToAPI: http://localhost:3001/api/hook/session-start
[2026-02-13T09:00:00.220Z] [SessionStart] postToAPI response: 200 body={"ok":true}
[2026-02-13T09:00:00.221Z] [SessionStart] --- Hook completed OK ---
```

エラー時のチェックポイント:
- `401 Unauthorized` → config.json の api_key と server/.env の API_KEY が不一致
- `ECONNREFUSED` → サーバーが起動していない
- `Failed to parse stdin` → フックへのデータ受け渡しに問題あり
- `No session_id, skipping` → Claude Code からsession_idが提供されていない

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| フックが発火しない | settings.local.json のパスが違う | `採用/.claude/settings.local.json` を確認 |
| 401 Unauthorized | API Key不一致 | `setup/hooks/config.json` と `server/.env` のキーを合わせる |
| ECONNREFUSED | サーバー未起動 | `cd server && npx tsx src/index.ts` |
| DBにデータが入らない | フックエラー | `debug.log` を確認 |
| ブラウザに表示されない | データ未登録 | 上記テストプロンプトを実行後に確認 |
