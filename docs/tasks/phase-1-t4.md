# P1-T4: fixture で inflation E2E 検証 + CI

> **設計**: [001-transcript-dedup.md](../specs/001-transcript-dedup.md) | **依存**: P1-T1, P1-T2
> **ステータス**: `[x]` 完了（2026-04-25）

## 完了報告（サブエージェント ad6c956cf1c268d9b）

### fixture 3 本
| ファイル | rows / uniqueIds | inflation (naive/parsed) |
|---------|------------------|-----|
| sample.jsonl (5f61e000) | 37 / 19 | **1.890** |
| sample-2.jsonl (8c6ad935) | 254 / 153 | **1.723** |
| sample-3.jsonl (93732d0c) | 236 / 147 | **1.541** |

全て `.gitignore` 済み（ユーザープロンプト本文を含むため）。

### テスト追加
- `setup/hooks/tests/inflation.test.js` (Vitest、4 tests) → 14/14 pass
- `server/tests/inflation.test.ts` (node:test+tsx、4 tests) → 16/16 pass
- アサーション: `rowRatio ≥ 1.5` かつ `1.5 ≤ tokenRatio < 5`（上限で過剰 dedup も検知）

### CI 追加
`.github/workflows/test.yml`:
- `hooks-tests`: Vitest（fixture が無ければ合成 U1-U9 のみ）
- `server-tests`: node:test+tsx
- `api-smoke`: MariaDB 11 サービス起動 + `npm run test:api`（`continue-on-error: true`、要改良）

### 更新ドキュメント
- `README.md` / `CLAUDE.md` にテスト実行手順
- `.gitignore` に fixture 除外

### 残件（別タスク化候補）
- `api-smoke` の `continue-on-error: true` → `scripts/test-api.ts` を CI 向けに hardening 後に false に
- fixture が CI で無い状態 → CI では合成テストのみ走る（プライバシートレードオフ、要件上 OK）
