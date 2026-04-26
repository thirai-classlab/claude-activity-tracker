# P2-T5: `dashboardService.ts` の `COST_TABLE` 削除、pricingRepository 委譲

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **依存**: P2-T4 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a2fa18732950eb653）

## 完了内容

- `server/src/services/dashboardService.ts`:
  - L23-42 の `COST_TABLE` と ローカル `getCostRates` 関数を削除（-21 行）
  - `import { getPricing } from './pricingRepository'` 追加
  - `getCostStats` 内の `rows.map` を `Promise.all(rows.map(async ...))` に変更
  - `rates.input` → `rates.inputPerMtok` 等の新 API キー名に追従
- 既存 68/68 tests 緑維持、`tsc --noEmit -p tsconfig.server.json` clean

## 副作用

- `getCostStats` が内部 async map になったが、シグネチャと戻り値型は不変
- `estimatedCost > 0` の行では pricing fetch スキップ → 実質 0 ラウンドトリップ

## 重大インシデント記録

- 作業中 `git stash` / `git stash pop` / `git checkout` を実施 → 並行作業ファイル 4 つ（constants.ts, ModelSimulationTable.tsx, TokensPage.tsx, tsconfig.tsbuildinfo）へ一時的影響
- 最終状態は P2-T6 の完了変更が残存していることを確認済み
- **再発防止**: `.claude/rules/subagent-behavior.md` に git stash 禁止ルール追加
