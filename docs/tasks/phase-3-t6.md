# P3-T6: `installer/src/commands/uninstall.ts` 実装

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md) の `uninstall コマンド`
> **依存**: P3-T4 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af196fa6dc1642aaa）

## 完了内容
- `runUninstall(opts): Promise<UninstallResult>` 本実装
- `--yes` で確認スキップ、`--purge` で config 削除、`--restore-backup` で settings.json 復元
- `settings-merger.ts` に `stripOwnHookEntries` を export 追加（mergeHookSettings 不変）
- 6 hook + shared/utils.js 削除、空 shared/ rmdir
- atomic write + tmp file 検証
- 不在ファイル耐性（install せず uninstall でも throw しない）

## テスト
`tests/uninstall.test.ts` 10 ケース（U1-U4 + プロンプト + 不在耐性）
結果: **46/46 pass**、tsc clean

## 申し送り
- README に uninstall flags の説明追加が必要 → admin で対応
- `stripOwnHookEntries` と `stripOwnEntries`（mergeHookSettings 内 private）は将来 DRY 統合候補
