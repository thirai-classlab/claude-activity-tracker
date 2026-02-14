# Claude Code Activity Tracker - フックインストールガイド

## 概要

このフォルダには、各メンバーの PC に Claude Code フックをインストールするためのスクリプトが含まれています。

フックをインストールすると、Claude Code の利用状況（トークン数・コスト・ツール使用・サブエージェント等）が自動的に API サーバーに送信されます。

> サーバーのセットアップについてはプロジェクトルートの [README.md](../README.md) または [CLAUDE.md](../CLAUDE.md) を参照してください。

---

## 前提条件

| 項目 | 必須 | 確認コマンド |
|------|------|-------------|
| Claude Code | 必須 | `claude --version` |
| Node.js v18+ | 必須 | `node -v` |
| Git | 推奨 | `git --version` |
| APIサーバーへの接続 | 必須 | `curl http://<server>:3001/health` |

**インストール前に API サーバーが起動していることを確認してください。**

---

## インストール

### macOS

```bash
cd claude-activity-tracker/setup
bash install-mac.sh
```

### Windows (PowerShell)

```powershell
cd C:\path\to\claude-activity-tracker\setup
powershell -ExecutionPolicy Bypass -File install-win.ps1
```

### インストーラーが行うこと

| Step | 内容 |
|------|------|
| 1 | Node.js / Git の存在確認 |
| 2 | API URL・API Key の入力（対話式プロンプト） |
| 3 | `~/.claude/hooks/` にフックファイル（6個 + shared/）をコピー |
| 4 | `config.json` を作成（BOMなし UTF-8） |
| 5 | `classic-level` npm パッケージをプリインストール（Claude メール取得用） |
| 6 | `~/.claude/settings.json` に6フック設定をマージ（既存フックは保持） |
| 7 | API サーバーへの接続テスト + 全フック動作テスト |

### インストール後のファイル配置

```
~/.claude/
├── settings.json               ← hooks セクションが追加される
└── hooks/
    ├── config.json             ← API接続設定
    ├── package.json            ← CommonJS 設定
    ├── shared/
    │   └── utils.js            ← 共通ユーティリティ（15関数）
    ├── aidd-log-session-start.js    ← SessionStart: セッション作成
    ├── aidd-log-prompt.js           ← UserPromptSubmit: ターン記録
    ├── aidd-log-subagent-start.js   ← SubagentStart: サブエージェント開始
    ├── aidd-log-subagent-stop.js    ← SubagentStop: サブエージェント終了
    ├── aidd-log-stop.js             ← Stop: トランスクリプト解析・全データ送信
    └── aidd-log-session-end.js      ← SessionEnd: セッション終了
```

### インストール後

**Claude Code を再起動してください。**
次回のセッションから自動的にデータが記録されます。

---

## 設定ファイル（config.json）

インストーラ実行時に作成される `~/.claude/hooks/config.json`:

```json
{
  "api_url": "http://<server>:3001",
  "api_key": "<管理者から共有された API キー>",
  "debug": true
}
```

| フィールド | 説明 |
|-----------|------|
| `api_url` | API サーバーの URL（管理者から指示されたもの） |
| `api_key` | 認証キー（管理者から指示されたもの）。**サーバー側 `.env` の `API_KEY` と一致させること** |
| `debug` | `true` にすると `~/.claude/hooks/debug.log` にログ出力 |

API URL や API Key を後から変更したい場合は、このファイルを直接編集してください。

### API キーの仕組み

```
クライアント (config.json)              サーバー (.env)
┌─────────────────────────┐    ┌──────────────────────────┐
│ "api_key": "abc123..."  │ == │ API_KEY=abc123...         │
└─────────────────────────┘    └──────────────────────────┘
         │                              │
         │   X-API-Key: abc123...       │
         ├─────────────────────────────►│ → 200 OK
         │                              │
         │   X-API-Key: wrong...        │
         ├─────────────────────────────►│ → 401 Unauthorized
         │                              │
         │   (キーなし)                  │
         ├─────────────────────────────►│ → 401 Unauthorized
```

- フックスクリプトは `config.json` の `api_key` を `X-API-Key` ヘッダーとして送信します
- サーバーは `.env` の `API_KEY` と照合し、不一致なら `401 Unauthorized` を返します
- サーバー側で `API_KEY` が**未設定**の場合は認証がスキップされます（開発モード）
- **本番環境では必ず `API_KEY` を設定してください**

---

## 動作確認

1. Claude Code を再起動
2. 何かプロンプトを送信
3. ダッシュボード（`http://<server>:3001/`）にセッションが表示されることを確認

### ログが記録されない場合

1. **API サーバーの確認**
   ```bash
   curl http://<server>:3001/health
   ```

2. **フックのデバッグログ確認**
   ```bash
   cat ~/.claude/hooks/debug.log
   ```
   `config.json` で `"debug": true` にするとログが出力されます。

3. **settings.json の確認**
   ```bash
   # macOS
   cat ~/.claude/settings.json

   # Windows (PowerShell)
   Get-Content $env:USERPROFILE\.claude\settings.json
   ```
   `"hooks"` セクションに6フックが登録されているか確認。

4. **config.json の確認**
   ```bash
   cat ~/.claude/hooks/config.json
   ```
   `api_url` が正しいか確認。

5. **フックの手動テスト**
   ```bash
   echo '{"session_id":"test","prompt":"test","model":"test"}' | node ~/.claude/hooks/aidd-log-session-start.js
   ```

---

## アンインストール

### macOS

```bash
bash claude-activity-tracker/setup/uninstall-mac.sh
```

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File claude-activity-tracker\setup\uninstall-win.ps1
```

### アンインストーラーが行うこと

- `~/.claude/hooks/` 内の `aidd-log-*` フックファイル（6個 + shared/ + config.json 等）を削除
- `~/.claude/settings.json` から `aidd-log-` を含むフック設定のみ削除（他のフック設定は保持）
- 一時ファイル（classic-level 等）を削除

---

## 配布方法

`setup/` フォルダを以下のいずれかの方法でメンバーに配布してください：

- **Git リポジトリ**: リポジトリを clone してもらう
- **共有フォルダ**: `setup/` フォルダを社内共有ドライブに配置
- **ZIP 配布**: `setup/` フォルダを ZIP 圧縮して配布

---

## FAQ

### Q: Claude Desktop（デスクトップアプリ）が必要ですか？

Claude Desktop がインストールされている場合、ログインアカウントのメールアドレスを
自動取得します。未インストールの場合は `-` が記録されますが、他の項目は正常に動作します。

### Q: VPN 使用時の IP アドレスはどうなりますか？

VPN 接続中は VPN のグローバル IP が記録されます。
IP は1時間キャッシュされるため、VPN 切替直後は古い IP が記録される場合があります。

### Q: 既に別のフック設定がある場合はどうなりますか？

インストーラ・アンインストーラともに既存のフック設定を保持します。
Tracker のフックは `aidd-log-` プレフィックスで識別されるため、他のフックに影響しません。
念のためバックアップを推奨します：

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.bak
```

### Q: プロンプトの内容が記録されるのが気になります

`aidd-log-prompt.js` でプロンプトの先頭500文字のみ記録しています。
記録を無効にしたい場合は `config.json` に `"disable_prompt": true` を追加してください。

### Q: セキュリティはどうなっていますか？

本システムは API キー認証（Hook API / Dashboard API）と Basic 認証（ダッシュボード UI）を提供しています。
HTTPS の設定、ファイアウォール、IP 制限など、ネットワークレベルのセキュリティは運用環境に応じて各自で設定してください。

---

## サポート

問題が発生した場合は、以下の情報を添えて管理者に報告してください：

- OS（macOS / Windows）とバージョン
- Node.js バージョン（`node -v`）
- `~/.claude/hooks/debug.log` の内容
- `~/.claude/settings.json` の内容
- `~/.claude/hooks/config.json` の内容
- エラーメッセージ（あれば）
