# P3-T2: `installer/src/lib/settings-merger.ts` 実装 + テスト

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md) の `settings.json マージ戦略`
> **依存**: P3-T1 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a8fa1630508e3918a）

## 完了内容

### 実装
- `mergeHookSettings({ settingsPath, hooksTemplate, hooksDir, dryRun, backupSuffix })` 完全実装
- マージ手順: readExisting → expandHooksDirPlaceholder → upsertHooks → (dryRun ? return : backup → atomicWrite)
- 自社判定: command 文字列に `aidd-log-` を含む → upsert（重複除去 + 追加）
- atomic write: tmp → JSON.parse 検証 → fs.rename
- 既定 backup suffix: `.bak.YYYYMMDD-HHMMSS`
- 不正 JSON / 配列 / 非 object はリジェクト

### テンプレ更新
`installer/src/templates/settings-hooks.json` のプレースホルダを `${CLAUDE_HOME}/...` → **`${HOOKS_DIR}/...`** に変更（API 仕様準拠）

### テスト
`tests/settings-merger.test.ts` 18 ケース（I1-I7 全網羅）
結果: **25/25 pass**（既存 paths テスト 7 + 新規 18）、tsc clean

## 申し送り

- **テンプレ内 hook 名と installer/hooks/ 実ファイル名の整合性**: P3-T8 で 6 hook を `aidd-log-{session-start, session-end, prompt, stop, subagent-start, subagent-stop}.js` でコピー済。テンプレ内のイベント↔ファイル対応を P3-T4 install コマンド実装時に最終検証
- `config.json` スキーマは P3-T4 で確定
