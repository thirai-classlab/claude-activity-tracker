# 【お知らせ】Claude Code Activity Tracker のインストール方法を npx ワンライナー化します

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [announcements/](.) > **2026-04-npx-installer.md**
> **公開日**: 2026-04-25
> **対象**: Claude Code Activity Tracker 利用者全員（特に新規参加メンバー）

## 3 行まとめ

1. **以前**: `git clone` → `bash setup/install-mac.sh` などの手動 5 ステップ
2. **これから**: `npx @classlab/claude-activity-tracker-hooks install` の **1 コマンド**で完了
3. 既存ユーザーは何もしなくて OK（次の hook 更新時に切替案内）

## 利用方法

### 新規セットアップ

ターミナルで以下を実行（対話モード）:

```bash
npx @classlab/claude-activity-tracker-hooks install
```

API URL と API キーが聞かれるので、運用担当から共有された値を入力。

### 非対話 / 一括配布

CI や Onboarding スクリプト用:

```bash
npx @classlab/claude-activity-tracker-hooks install \
  --api-url https://ai-driven-analytics.sandboxes.jp \
  --api-key "$CLAUDE_TRACKER_KEY"
```

### 設定確認 / トラブルシュート

```bash
# ヘルスチェック（hook が動作中か、API へ到達できるか）
npx @classlab/claude-activity-tracker-hooks doctor

# API キー変更
npx @classlab/claude-activity-tracker-hooks config set api-key "$NEW_KEY"

# アンインストール（テスト後の cleanup 等）
npx @classlab/claude-activity-tracker-hooks uninstall
```

## 何が変わるか

| 項目 | 旧 | 新 |
|------|----|----|
| インストール手順数 | 5（clone, init.sh, install.sh, .env, config.json） | 1（`npx ... install`） |
| 平均所要時間 | 5〜10 分 | 30 秒〜2 分 |
| 既存 settings.json の安全性 | 上書き / マージ手動 | 自動 atomic merge + バックアップ |
| 設定変更（キー更新） | config.json 手編集 | `aidd-tracker config set` |
| OS 別スクリプト | mac / windows 2 種 | 統一（OS 別パスは自動解決） |

## 既存ユーザーへの影響

**ありません**。現在動作中の hook はそのまま継続します。次のような契機で切替推奨:

- 別マシンでの再セットアップ
- API キーローテーション時
- hook の不具合解消が必要な時（dedup 修正含む新しい hook が配布されている）

切替時は古い設定が自動でバックアップされ、必要なら復元可能。

## 関連ドキュメント

- [`installer/README.md`](../../installer/README.md) — 詳細マニュアル + flag 一覧 + トラブルシュート
- [`docs/specs/003-npx-installer.md`](../specs/003-npx-installer.md) — 実装仕様
- [`docs/announcements/2026-04-data-correction.md`](2026-04-data-correction.md) — 4 月の集計値訂正に関する別告知

## FAQ

### Q1. npm 公開アカウント `@classlab` とは？

社内向けの公開 npm スコープです。hook コードに秘匿情報は含まれません（API キー等は実行時の引数 / 環境変数経由）。

### Q2. 既存の `setup/install-mac.sh` はどうなる？

将来的に `npx` を呼ぶ薄いシムに置き換え予定（P3-T11）。当面は両方使えます。

### Q3. オフライン環境で使える？

現状は `npx` 経由のため初回は npm registry へのアクセスが必要。社内ミラー対応は要望次第で検討。

### Q4. インストール時に何を聞かれる？

- API サーバ URL
- API キー（マスク入力）
- Claude アカウントメール（任意、自動検出も可）
- インストール先スコープ（user / project）

非対話モードでは flag で指定可能。

### Q5. 何かトラブったら？

`installer/README.md` のトラブルシュート表を参照、または運用チャネルへ。
