# P3-T4: `installer/src/commands/install.ts` 本実装

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **依存**: P3-T2 / P3-T3 / P3-T8 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント acb5a41198d7e6243）

## 完了内容
- `runInstall(opts)` 本実装（プロンプト/CLI flags、hooks コピー、settings merge、config.json 生成 chmod 600、healthcheck）
- `cli.ts` に 7 flag 配線（--api-url, --api-key, --email, --scope, --force, --no-healthcheck, --dry-run）
- `tests/install.test.ts` 統合テスト 5 件（IT1-IT4）
- 結果: **30/30 pass**、tsc clean、build clean

## 設計判断
- `templates/settings-hooks.json` は `package.json#files` 非対象 → npm 公開時 ENOENT → **inline 化** (`SETTINGS_HOOKS_TEMPLATE` 定数)。元ファイルは仕様の SSOT として残置 + 同期義務コメント

## 申し送り
- T6 uninstall: `shared/utils.js` 削除、空 `shared/` の rmdir、settings 自社エントリ除去、`config.json` 削除は `--purge` flag で
- T5 doctor: hook 配置 / settings 登録 / config / API 疎通の 4 段階診断
- healthcheck サーバ側で `install-healthcheck-` prefix を弾く処理は将来検討
