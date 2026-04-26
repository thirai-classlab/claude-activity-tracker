# P3-T7: `installer/src/commands/config.ts` 実装

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md) の `config コマンド`
> **依存**: P3-T4 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a8e6a50f2b7bbb250）

## 完了内容

### 実装
- `runConfigList` / `runConfigGet` / `runConfigSet` / `runConfigMigrate` 4 関数 export
- `cli.ts` で `commander` のサブコマンドネスト（`config list/get/set/migrate`）配線
- `api_key` マスク（先頭4文字 + `***`）
- atomic write（tmp → rename）+ chmod 600 維持
- 不正キー（api_url/api_key/claude_email 以外）を拒否
- `migrate` は現状 NOOP + 警告（旧スキーマ未定義のため）

### テスト
- `tests/config.test.ts` 9 テスト（C1-C5 suite）
- 結果: **39/39 pass**（既存 30 + 新規 9）
- マスク確認: 平文 api_key は出力に一切含まれない

## 申し送り

- ⚠️ サブエージェントが**作業中に `git stash` を 1 回実行**したと自己申告。即 stash pop で復元済み。ファイル状態は確認済（installer/src/commands/* と tests/* 全件存在）
- `cli.ts:61` で P3-T6 の `runUninstall` 戻り型と commander 不整合の tsc エラーあり（T6 側で吸収予定）
- `runConfigUnset` は将来拡張で検討
