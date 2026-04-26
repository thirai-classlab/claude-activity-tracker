# @classlab/claude-activity-tracker-hooks

> **パンくず**: [../README.md](../README.md) > **installer/README.md**

Claude Code Activity Tracker の hook を **npx ワンライナー** でインストールするための CLI。

## クイックスタート

```bash
# 対話インストール
npx @classlab/claude-activity-tracker-hooks install

# 非対話インストール（CI / 一括配布向け）
npx @classlab/claude-activity-tracker-hooks install \
  --api-url https://ai-driven-analytics.sandboxes.jp \
  --api-key "$CLAUDE_TRACKER_KEY" \
  --email "$USER_EMAIL" \
  --scope user

# ヘルスチェック
npx @classlab/claude-activity-tracker-hooks doctor

# アンインストール
npx @classlab/claude-activity-tracker-hooks uninstall
```

> **Phase 3 進行中**: P3-T1（skeleton）/ P3-T2（settings-merger）/ P3-T3（paths）/ P3-T8（hooks コピー）完了。`install` 等の本実装は P3-T4 以降で順次完成。最新状態は [`docs/tasks/list.md`](../docs/tasks/list.md) 参照。

## 提供コマンド

| コマンド | 役割 |
|---------|------|
| `install` | `installer/hooks/aidd-log-*.js` を `~/.claude/hooks/` に配置、`settings.json` の hooks 部分にエントリ追加、`config.json` を生成、API 疎通チェック |
| `uninstall` | hook ファイル削除 + settings 自社エントリ除去 |
| `doctor` | hook 配置・settings 登録・config・API 疎通の各段階を OK/NG で診断 |
| `config` | `config.json` の参照・更新（API キー変更等） |

## CLI flags（install）

| flag | 説明 | 既定 |
|------|------|------|
| `--api-url <url>` | API サーバの URL | プロンプト |
| `--api-key <key>` | API キー | プロンプト（masked） |
| `--email <email>` | Claude アカウントのメール | 自動検出 or 空 |
| `--scope <user\|project>` | インストール先 | `user` |
| `--force` | 既存自社 hook を確認なし上書き | false |
| `--no-healthcheck` | 疎通チェックスキップ | false |
| `--dry-run` | 計画表示のみ、ファイル変更なし | false |

## 動作

### インストール時の処理

1. **既存 settings.json をバックアップ** (`settings.json.bak.YYYYMMDD-HHMMSS`)
2. **6 hook + shared/utils.js** を `~/.claude/hooks/` にコピー
3. **settings.json の hooks 部分を merge**
   - 自社判定: command 文字列に `aidd-log-` を含む → upsert（重複除去 + 追加）
   - 他社 hook は完全保持
4. **config.json 生成** (`api_url` / `api_key` / `claude_email`、chmod 600)
5. **API 疎通チェック** (`POST /api/hook/session-start` にダミー送信)
6. **サマリ表示**

### 環境変数

| env | 用途 |
|-----|------|
| `CLAUDE_HOME` | `~/.claude` の場所を override |
| （既存の Claude Code 環境変数すべて引き継ぎ） | |

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| `EACCES: permission denied` | `~/.claude/hooks/` への書込権限なし | `--scope project` でプロジェクト配下に配置 |
| 疎通チェック失敗 | API URL or キー誤り | `aidd-tracker config set api-key NEW_KEY` で更新 |
| 既存他社 hook が消えた | settings.json マージ失敗 | バックアップから復元: `cp settings.json.bak.* settings.json` |
| `settings.json` 構文エラー | 手書きコメント等の混入 | エラー終了で既存ファイルは保護される。ログ確認後手修正 |
| `npx` が古い | Node 18 未満 | `node -v` で確認、Node 20+ 推奨 |

## 開発

```bash
cd installer
npm install
npm run dev -- --help          # tsx で直接実行
npm run dev -- install --dry-run --api-url http://localhost:3010 --api-key test
npm run build                  # dist/ に出力
npm test                       # node:test
node dist/cli.js --version
```

## パッケージ構成

```
installer/
├── src/
│   ├── cli.ts                  # commander エントリ
│   ├── commands/               # install / uninstall / doctor / config
│   ├── lib/
│   │   ├── settings-merger.ts  # settings.json 安全 merge
│   │   ├── paths.ts            # OS 別 ~/.claude 解決
│   │   └── api-client.ts       # 疎通チェック
│   └── templates/
│       └── settings-hooks.json # 6 種 hook の登録テンプレ
├── hooks/                      # 配布される hook 実体（aidd-log-*.js + shared/utils.js）
└── tests/                      # 単体・統合テスト
```

## セキュリティ

- API キーは `~/.claude/hooks/config.json` に **chmod 600**（unix）で保存
- HTTPS のみ許可、自己署名は明示同意必要（将来）
- 既存 settings.json は **常に atomic write** + バックアップ + パース失敗時自動ロールバック

## 関連ドキュメント

- [`../docs/specs/003-npx-installer.md`](../docs/specs/003-npx-installer.md) — 実装仕様
- [`../docs/tasks/list.md`](../docs/tasks/list.md) — Phase 3 タスク
- [`../setup/hooks/`](../setup/hooks/) — 元 hook（current SSOT、本パッケージでは hooks/ にコピー）
- [`../README.md`](../README.md) — プロジェクト全体

## ライセンス

MIT — `LICENSE` 参照
