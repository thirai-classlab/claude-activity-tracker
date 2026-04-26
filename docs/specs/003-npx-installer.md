# Draft 003: npx インストーラ `@classlab/claude-activity-tracker-hooks`

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **003-npx-installer.md**
> **ステータス**: 🟡 未承認（レビュー依頼中）
> **起票日**: 2026-04-25

## 目次

- [問題](#問題)
- [ユーザー体験](#ユーザー体験)
- [パッケージ構成](#パッケージ構成)
- [CLI コマンド詳細](#cli-コマンド詳細)
- [settings.json マージ戦略](#settingsjson-マージ戦略)
- [公開方針](#公開方針)
- [テスト設計](#テスト設計)
- [セキュリティ考慮事項](#セキュリティ考慮事項)
- [移行計画](#移行計画)
- [タスク分解](#タスク分解)
- [参考文献](#参考文献)

---

## 問題

現状のインストールフロー:
1. リポジトリ clone
2. `bash init.sh` で `config.json` 生成
3. `setup/install-mac.sh` or `install-win.ps1` を手動実行
4. `~/.claude/hooks/` にコピー、`~/.claude/settings.json` を手編集

問題点:
- **セットアップに 5〜10 分**、人為的ミスが起きやすい（既存 settings.json の破壊事例あり）
- Windows / Mac で別スクリプト
- メンバー PC ごとに clone 要否で混乱
- 設定更新時（API キー変更）に再度同じ手順
- 既存 hook 設定がある場合の競合が未定義

## ユーザー体験

```bash
# インストール（対話モード）
npx @classlab/claude-activity-tracker-hooks install

# 非対話モード（CI / 一括配布）
npx @classlab/claude-activity-tracker-hooks install \
  --api-url https://ai-driven-analytics.sandboxes.jp \
  --api-key "$CLAUDE_TRACKER_KEY" \
  --email "$USER_EMAIL" \
  --scope user

# ヘルスチェック
npx @classlab/claude-activity-tracker-hooks doctor

# 設定更新
npx @classlab/claude-activity-tracker-hooks config set api-key "$NEW_KEY"

# アンインストール
npx @classlab/claude-activity-tracker-hooks uninstall

# バージョン確認
npx @classlab/claude-activity-tracker-hooks --version
```

### install 実行時の UX

```
? インストール先:  ◉ ユーザー全体 (~/.claude)  ○ プロジェクト限定 (.claude)
? API サーバーの URL:  https://ai-driven-analytics.sandboxes.jp
? API キー:  ********************
? Claude アカウントのメール (任意、自動検出も可):  [auto]

既存のフック設定を検出しました。
? どうしますか?
  ◉ 新しいフックを追加（既存を保持）
  ○ 既存を置き換え（破壊的）
  ○ 中止

✓ ~/.claude/settings.json をバックアップしました → settings.json.bak.20260425-231055
✓ ~/.claude/hooks/ に 7 ファイルをコピーしました
✓ config.json を生成しました
✓ 疎通チェック OK (200 from /api/hook/session-start)

完了！ 次のセッションから自動的に記録されます。
ヘルスチェックは `npx @classlab/claude-activity-tracker-hooks doctor` で実行可能。
```

## パッケージ構成

```
@classlab/claude-activity-tracker-hooks/
├── package.json                 # "bin": { "aidd-tracker": "./dist/cli.js" }
├── README.md
├── LICENSE                      # MIT
├── src/
│   ├── cli.ts                   # commander CLI エントリ
│   ├── commands/
│   │   ├── install.ts
│   │   ├── uninstall.ts
│   │   ├── doctor.ts
│   │   └── config.ts
│   ├── lib/
│   │   ├── settings-merger.ts   # settings.json 安全マージ
│   │   ├── paths.ts             # OS 別 ~/.claude 解決
│   │   ├── api-client.ts        # 疎通チェック
│   │   └── backup.ts
│   └── templates/
│       └── settings-hooks.json  # 登録する hooks ブロックのテンプレ
├── hooks/                       # ユーザー PC にコピーされる実体
│   ├── aidd-log-session-start.js
│   ├── aidd-log-session-end.js
│   ├── aidd-log-prompt.js
│   ├── aidd-log-stop.js
│   ├── aidd-log-subagent-start.js
│   ├── aidd-log-subagent-stop.js
│   └── shared/
│       └── utils.js
└── tests/
    ├── settings-merger.test.ts
    ├── install.integration.test.ts
    └── fixtures/
```

### package.json の要点

```json
{
  "name": "@classlab/claude-activity-tracker-hooks",
  "version": "1.0.0",
  "bin": {
    "aidd-tracker": "./dist/cli.js"
  },
  "files": ["dist/**", "hooks/**", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^12",
    "prompts": "^2",
    "kleur": "^4"
  }
}
```

依存はすべて軽量 (`prompts` より `inquirer` の方が大きい)。

## CLI コマンド詳細

### `install`

```
引数:
  --api-url <url>        API サーバ URL (必須 or 対話)
  --api-key <key>        API Key (必須 or 対話)
  --email <email>        Claude アカウントのメール (任意、自動検出)
  --scope <user|project> インストール先 (既定: user)
  --force                既存 hooks を上書き (確認プロンプトなし)
  --no-healthcheck       疎通チェックをスキップ
  --dry-run              何もせず計画だけ表示

処理:
  1. Node 18+ チェック（`npx` で実行されるが念のため）
  2. ~/.claude 相当パスの解決（Windows/macOS/Linux）
  3. 既存 settings.json を読み込み、バックアップ
  4. hooks/* をコピー先に展開（file mode 644）
  5. templates/settings-hooks.json を既存 settings.json に安全マージ
  6. config.json を生成（api_url, api_key, claude_email）
  7. healthcheck: POST /api/hook/session-start にダミー送信 → 200 確認
  8. サマリ出力
```

### `doctor`

```
表示項目:
  - パッケージ版 / 最新版
  - Node バージョン
  - 各 hook ファイルの存在と mtime
  - settings.json 内の hooks 登録状態（正常 / 欠落 / 競合）
  - config.json の有効性
  - 疎通: GET /api/health (または POST /api/hook/session-start)
  - 最近の debug.log 行数（エラーがあれば先頭を表示）

終了コード: 0 正常、1 警告、2 エラー
```

### `uninstall`

```
処理:
  1. 最新バックアップから settings.json を復元するか選択
     （復元しない場合は「当該 hooks セクションのみ削除」を実行）
  2. hooks/aidd-log-*.js を削除
  3. config.json を削除（オプション）
  4. debug.log / キャッシュも削除するか確認
```

### `config`

```
サブコマンド:
  config list                      現在の config.json を表示
  config set <key> <value>         1 項目更新
  config migrate                   旧形式から新形式へ
```

## settings.json マージ戦略

`~/.claude/settings.json` は他プロジェクトやユーザー設定も同居するため**破壊禁止**。

### マージアルゴリズム

```
1. 既存 settings.json を読み込み（存在しなければ {} として扱う）
2. バックアップを settings.json.bak.YYYYMMDD-HHMMSS に保存
3. hooks オブジェクトに以下をマージ:

   {
     "hooks": {
       "SessionStart": [...既存..., {own: aidd-log-session-start}],
       "UserPromptSubmit": [...既存..., {own: aidd-log-prompt}],
       "PreCompact": [...既存..., {own: ...}],
       "SubagentStart": [...],
       "SubagentStop": [...],
       "Stop": [...既存..., {own: aidd-log-stop}],
       "SessionEnd": [...既存..., {own: aidd-log-session-end}]
     }
   }

4. 「own」判定:
   - command 文字列に "aidd-log-" を含むエントリは自社のものと判定
   - 自社エントリは upsert、他は触らない
   - 重複する own エントリがあれば除去して 1 つにする（update 挙動）
5. atomic write:
   - tmp file に書いて os.rename() → EINTR 耐性
6. 書き込み後に再度パース検証（壊れたら自動ロールバック）
```

### エッジケース

| ケース | 挙動 |
|--------|------|
| settings.json が非 JSON (手書きコメントあり等) | エラー終了、既存を保護 |
| hooks キー無し | 新規作成 |
| 同じ matcher に複数社フック | 既存並列に追加（`hooks` 配列要素として） |
| 2 回 install 実行 | 重複せず upsert |
| `claude` コマンドのバージョンが古い hook 仕様 | スキップし警告 |

## 公開方針

### オプション A: npm 公開（推奨）

- `npm publish --access public` で公開
- `npx @classlab/...` で全社員がすぐ使える
- 更新時は `npm publish` → 全員 `npx` 経由で最新取得
- **懸念**: 社外に公開される（個人情報やロジックは含まないので影響小）

### オプション B: GitHub Packages (private npm)

- 社内 GitHub Organization 認証下でのみ利用可
- `.npmrc` に認証設定が必要 → 導入ハードルが上がる
- セキュリティ要件が強い場合のみ

### オプション C: 直接 GitHub から

```bash
npx github:classlab-inc/claude-activity-tracker-hooks install
```

- 公開 repo である必要がある（現状の repo が public かは要確認）
- 公式 npm レジストリを使わずとも配布可能

**推奨**: A（公開 OSS 化）。hook スクリプトには秘匿情報なし、ロジックも汎用的。社外コントリビューションも期待できる。

## テスト設計

### 単体テスト

| # | ケース | 期待 |
|---|--------|------|
| I1 | 空 settings.json へインストール | 新規作成、hook 7 件登録 |
| I2 | 既存他社 hook あり | 既存保持、自社 hook 追加 |
| I3 | 2 回目 install | 重複せず上書き |
| I4 | 無効 JSON | エラー終了、保護 |
| I5 | `--dry-run` | 変更なし、計画表示のみ |
| I6 | `--force` で既存自社 hook 上書き | そのまま上書き |
| I7 | healthcheck 失敗 | 警告表示、インストール自体は成功扱い |
| I8 | `uninstall --restore` | バックアップから復元 |

### 統合テスト

- Docker 上で `node:20-alpine` / `node:18` の両方で `npx` 実行
- macOS / Windows / Linux で `~/.claude` パス解決の検証（CI matrix）

### E2E テスト

- 実際の Claude Code セッションで install → 会話 → DB にデータ到達を確認
- GitHub Actions で nightly 実行

## セキュリティ考慮事項

| 項目 | 対策 |
|------|------|
| API キーの平文保存 | `~/.claude/hooks/config.json` を `chmod 600` / Windows は ACL |
| 中間者攻撃 | `--api-url` は HTTPS のみ許可、自己署名は `--allow-insecure` で明示同意 |
| 悪意ある hook 置換 | `npm publish` に 2FA 必須、署名付きリリース |
| 既存 settings.json の破壊 | 常にバックアップ + atomic write + 壊れたら自動ロールバック |
| `npx` 実行時のサプライチェーン | `package-lock.json` を同梱、依存最小化（3 パッケージのみ） |
| Claude の email 不正取得 | LevelDB 読取を opt-in に、`--no-autodetect` 対応 |

## 移行計画

### フェーズ 1: 並行運用

- 既存 `setup/install-mac.sh` / `install-win.ps1` は維持
- npm package を別 repo で開発、npm 公開
- 内部で試験導入

### フェーズ 2: 既存 shell スクリプトを薄いシムに

```bash
# setup/install-mac.sh の中身
npx @classlab/claude-activity-tracker-hooks install "$@"
```

### フェーズ 3: README / ドキュメントを npx 中心に書き換え、shell script は deprecated 表示

### フェーズ 4: 1 リリース以上経過後に shell script を削除

## タスク分解

承認後 `docs/tasks/list.md` に登録予定:

- T1: 新 repo `@classlab/claude-activity-tracker-hooks` 初期化（別 repo or monorepo 検討）
- T2: `src/lib/settings-merger.ts` 実装 + テスト (I1〜I6)
- T3: `src/lib/paths.ts` 実装（OS 別パス解決）
- T4: `src/commands/install.ts` 実装 + 統合テスト
- T5: `src/commands/doctor.ts`
- T6: `src/commands/uninstall.ts`
- T7: `src/commands/config.ts`
- T8: hooks 実体を現行 `setup/hooks/` からコピー（逆転: 将来は npm → 本 repo へ）
- T9: README（npx 使用例、トラブルシュート）
- T10: npm publish ワークフロー（GitHub Actions、2FA）
- T11: 既存 `setup/install-*.sh` をシム化
- T12: 本 repo の README / CLAUDE.md を npx 中心に更新
- T13: 社内向け移行アナウンス文書

## 参考文献

- [npm — bin field](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin) — CLI 登録方法
- [npx](https://docs.npmjs.com/cli/v10/commands/npx) — パッケージ実行の仕様
- [Claude Code — hooks](https://docs.claude.com/en/docs/claude-code/hooks) — hook 設定仕様、`settings.json` スキーマ
- [@commander-js/extra-typings](https://github.com/tj/commander.js) — CLI ビルダー
- `setup/install-mac.sh` / `setup/install-win.ps1` — 既存インストーラ（移行対象）
