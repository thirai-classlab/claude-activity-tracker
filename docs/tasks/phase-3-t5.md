# P3-T5: `installer/src/commands/doctor.ts` 実装

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md) の `doctor コマンド`
> **依存**: P3-T4 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a981b46e2c3db554f）

## 完了内容

### 実装
- `runDoctor(opts): Promise<number>` 6 段階チェック:
  1. Node version
  2. paths
  3. hook ファイル（aidd-log-*.js 6 + shared/utils.js）
  4. settings.json
  5. config.json + chmod 600
  6. API 疎通（POST /api/hook/session-start）
- カラー出力（kleur）`[OK]` / `[WARN]` / `[ERROR]`
- exit code: 0 (OK or WARN) / 2 (ERROR)
- `cli.ts` の `doctor` action 連携 + `--scope` option

### テスト
`tests/doctor.test.ts` 5 テスト（D1 全OK / D2 hook 欠損 / D3 settings 壊れ / D4-a 500応答 / D4-b 未到達 + config 欠損）
結果: **45/45 pass**（既存 40 + 新規 5）、tsc clean

## 申し送り
- パッケージ最新版チェック（npm registry 問合せ）は未実装、別タスクで追加可能
- `debug.log` パース表示も未実装（hookService 仕様依存のため別途）
