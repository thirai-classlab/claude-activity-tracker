# 既知の問題・注意点

> **パンくず**: [README.md](../README.md) > docs > **known-issues.md**

## 目次

- [MariaDB 固有の注意](#mariadb-固有の注意)
- [API キー認証](#api-キー認証)
- [Windows (PowerShell) 固有の注意](#windows-powershell-固有の注意)
- [フック共通の注意](#フック共通の注意)
- [メンバー識別](#メンバー識別)
- [コスト計算](#コスト計算)
- [settings.json のフック設定](#settingsjson-のフック設定)
- [トラブルシューティング](#トラブルシューティング)

---

## MariaDB 固有の注意

- **`SUM()` / `COUNT()` で BigInt エラー**: Prisma の `$queryRawUnsafe` で集計関数を使うと BigInt が返る場合がある。
  **`CAST(... AS DOUBLE)` で囲むこと。**
  ```sql
  -- NG: BigInt deserialization error の可能性
  SELECT SUM(total_input_tokens) FROM sessions
  -- OK
  SELECT CAST(SUM(total_input_tokens) AS DOUBLE) FROM sessions
  ```

- **DateTime は native DATETIME 型**: MariaDB では Prisma が DATETIME 型でそのまま保存する。
  日付関数は `DATE(started_at)`, `HOUR(started_at)`, `DAYOFWEEK(started_at)` 等をそのまま使う。

- **Docker Compose で起動**: `docker compose up -d --build` で MariaDB + API が同時に起動する。
  MariaDB のヘルスチェックが通るまで API コンテナは待機する（`depends_on: condition: service_healthy`）。

- **接続先の違い**: Docker 内では `db:3306`、ホストからは `localhost:3306` でアクセスする。
  `.env` の `DATABASE_URL` は Docker 用（`@db:3306`）がデフォルト。

- **`.env` 変更時の注意**: `docker compose restart` では `.env` ファイルの変更は反映されない。
  環境変数は**コンテナ作成時**に注入されるため、変更後は必ず `docker compose up -d --force-recreate` を実行する。

## API キー認証

- **仕組み**: Hook API（`/api/hook/*`）は `X-API-Key` ヘッダーによる認証で保護される。
  Dashboard API（`/api/dashboard/*`）は認証不要。

- **サーバー側**: `.env` の `API_KEY` で設定。`openssl rand -hex 32` で生成推奨。

- **クライアント側**: `~/.claude/hooks/config.json` の `api_key` に同じ値を設定。

- **キー不一致**: サーバーとクライアントの API キーが一致しない場合 `401 Unauthorized` が返り、
  フックデータは記録されない。`~/.claude/hooks/debug.log` で確認できる。

- **開発モード**: サーバー側の `API_KEY` が未設定（空文字列）の場合、認証はスキップされる。
  本番環境では必ず設定すること。

## Windows (PowerShell) 固有の注意

- **UTF-8 BOM 問題**: PowerShell 5.x の `Set-Content -Encoding UTF8` は BOM 付きで書き込む。
  Node.js の `JSON.parse()` は BOM を通常文字として扱うため **パースエラーになる**。
  ファイル書き込みは必ず `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))` を使う。

- **`Join-Path` の引数制限**: PowerShell 5.x は 3引数を受け付けない。
  `Join-Path (Join-Path $a $b) $c` のようにネストする。

- **JS テンプレート内の文字列結合**: PowerShell がインライン JS を解釈してしまう。
  `@'...'@` ヒアストリングを使い、`__PLACEHOLDER__` パターンで `.Replace()` する。

- **日本語文字化け**: コンソールの文字コードが Shift-JIS の場合がある。
  スクリプト冒頭で `chcp 65001 | Out-Null` + `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` を設定する。

## フック共通の注意

- **config.json の BOM 除去**: `shared/utils.js` の `loadConfig()` は `stripBOM()` 付きで読み込むため、
  万が一 BOM が付与されても安全。ただし他のツールで直接 `JSON.parse()` する場合は注意。

- **フックの実行順序**: Claude Code は複数のフックイベントを非同期に発火する。
  session-start より先に prompt が到着する場合がある。
  `hookService.ts` の `findOrCreateSession()` でスタブセッションを作成して対応済み。

- **transcript 解析は aidd-log-stop.js のみ**: JSONL トランスクリプトの完全解析（トークン集計、ツール使用抽出、
  ファイル変更一覧）は Stop フック側で行い、構造化データとして API に POST する。
  サーバー側では解析しない（データ受信と DB 書き込みのみ）。

- **timeout 設定**: 各フックには timeout が設定されている（10-30秒）。
  transcript が大きい場合は aidd-log-stop.js の timeout (30秒) に注意。

## メンバー識別

- **主キー: `gitEmail`** — `git config user.email` の値で一意に識別する。
- `claudeAccount`（Claude ログインメール）は補助情報として保存。
- `displayName` はオプション。ダッシュボードでは `gitEmail` を表示名として使用。
- メンバーは `findOrCreateMember()` で自動作成される（初回セッション時）。

## コスト計算

- モデル名から `opus` / `sonnet` / `haiku` を判定し、単価テーブルを参照。
- 単価は `.env` の `COST_*` 変数で上書き可能。
- キャッシュ書き込み = 入力単価 x 1.25、キャッシュ読み取り = 入力単価 x 0.1。
- 不明なモデルは `sonnet` として計算する。

## settings.json のフック設定

- インストーラは **既存のフック設定を保持** してマージする（上書きしない）。
- Tracker のフックは `/hooks/aidd-log-` を含むコマンドで識別し、再インストール時は古いエントリを除去してから追加。
- アンインストーラは `hooks` セクション全体を削除するため、他のフック設定も消える点に注意。

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| ダッシュボードが空 | APIサーバー未起動 or フック未設定 | `curl localhost:3001/health` + `cat ~/.claude/settings.json` |
| BigInt エラー | MariaDB の SUM が BigInt を返す | `CAST(... AS DOUBLE)` を SQL に追加 |
| config.json パースエラー | UTF-8 BOM 付き | BOMなしで再保存、または `stripBOM()` 確認 |
| フックがタイムアウト | transcript が大きい / API サーバー遅延 | `config.json` の debug を有効にしてログ確認 |
| セッションデータが不完全 | フックの実行順序問題 | `findOrCreateSession()` でスタブ作成済み。ログ確認 |
| Windows で文字化け | PowerShell の文字コード | `chcp 65001` 実行済みか確認 |
| Join-Path エラー (Win) | PowerShell 5.x の引数制限 | ネストした `Join-Path` を使用 |
