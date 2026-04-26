# P3-T1: npx installer skeleton 初期化

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af5fd508755abaf9b）

## 完了内容

`installer/` 新規ディレクトリ:
- `package.json`: `@classlab/claude-activity-tracker-hooks@0.1.0`、ESM (`"type": "module"`)、bin = `aidd-tracker`
- `tsconfig.json`、`.gitignore`、LICENSE (MIT)、README
- `src/cli.ts`: commander entry、`--version` / `--help` 動作
- `src/commands/{install,uninstall,doctor,config}.ts`: stub 関数 export
- `src/lib/{settings-merger,paths,api-client}.ts`: 型定義のみ
- `src/templates/settings-hooks.json`: 6 種 hook 登録テンプレ
- `npm install` 成功（15 deps、0 vulnerabilities）
- `npx tsc --noEmit` clean

## 設計からの差分（後続タスク影響）
- ESM 化 (`"type": "module"`) → `import.meta.url` + `readFileSync` で package.json 読み
- commands を関数 export 形式に（cli.ts から委譲）→ 後続 T4-T7 で実装しやすく
- 相対 import は `.js` 拡張子付き
