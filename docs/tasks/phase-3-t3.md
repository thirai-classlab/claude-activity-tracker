# P3-T3: `installer/src/lib/paths.ts` OS 別パス解決

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af9a0fd6e253f7151）

## 完了内容
- `getClaudeHome` / `getSettingsPath` / `getHooksDir` / `getConfigPath` 4 関数 export
- `Scope = 'user' | 'project'`、`PathOptions { scope, cwd }`
- `CLAUDE_HOME` env override が最優先（空文字は無視）
- Windows: `process.platform === 'win32'`、`os.homedir()` 経由
- 区切り文字は `path.join` で吸収
- `tests/paths.test.ts` 11 ケース全緑（P1〜P5）
- tsc --noEmit clean

## 申し送り
- 後続 T4 以降の writer 系は `getHooksDir({ scope, cwd })` で user / project 切替可能
- config.json は `getConfigPath()` 経由
