# タスク一覧

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [tasks/](.) > **list.md**

> 🟧 **ステータス: ローカル動作検証・調整中（2026-04-26〜）**
>
> Phase 1 / 1.5 / 2 / 3 の実装はすべて完了 (38/38)。現在は実機（メインエージェントの PC）で
> インストーラを `~/.claude/` に適用し、Claude Code の実セッションを使ってデータが
> 正しくサーバへ流入し、ダッシュボード表示が期待通りであることを検証中。
>
> - 旧 DB データはすべて削除済み（`sessions / turns / subagents / tool_uses / members / file_changes / session_events / analysis_logs`、`model_pricing` 29 件のみ保持）
> - サーバ: `http://localhost:3010`（HOST_PORT=3010、API container 稼働中）
> - DB: MariaDB on `127.0.0.1:3307`（D-010 適用済み）
> - 検証中の挙動 / 観測ずれは [`docs/decisions/pending.md`](../decisions/pending.md) に随時起票
> - 検証完了後、本バナーは外す

`.claude/rules/task-management.md` に従って管理。設計なしのタスク追加は禁止。

## ステータス凡例

| 記号 | 意味 |
|------|------|
| `[ ]` | 未着手 |
| `[>]` | 進行中 |
| `[x]` | 完了 |
| `[-]` | 取り下げ |

## 実装順序（D-004 決定）

**Phase 1 (Spec 001)**: トランスクリプト dedup → 集計正常化（最優先）
**Phase 2 (Spec 002)**: モデル/料金レジストリ API 化（1 の後、検証データ確保のため）
**Phase 3 (Spec 003)**: npx インストーラ（独立、並行可能）

## タスク

| 状態 | ID | タイトル | 詳細 | 設計 |
|------|----|---------|------|------|
| `[x]` | P1-T1 | `shared/utils.js` に message.id dedup 付き parseTranscript 実装 + テスト | [phase-1-t1.md](phase-1-t1.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P1-T2 | `server/src/services/transcriptParser.ts` 同ロジック移植 | [phase-1-t2.md](phase-1-t2.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P1-T3 | `handleStop` の turnCount / toolUseCount を DB 実数に切替 | [phase-1-t3.md](phase-1-t3.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P1-T4 | fixture でインフレ率（実測 1.7〜1.95x）を E2E 検証 + CI 追加 | [phase-1-t4.md](phase-1-t4.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P1-T5' | 既存データ UI に「計測不能期間」注釈バナー追加（D-001 C 案） | [phase-1-t5.md](phase-1-t5.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P1-T6 | 社内向け「過去数値は ~2x 膨張していた」告知文書 | [phase-1-t6.md](phase-1-t6.md) | [001](../specs/001-transcript-dedup.md) |
| `[x]` | P2-T1 | Prisma schema に `model_pricing` テーブル追加 + migration | [phase-2-t1.md](phase-2-t1.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T2 | `pricingRepository.ts` 実装 + テスト (P1〜P6) | [phase-2-t2.md](phase-2-t2.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T3 | `scripts/sync-pricing.ts`（LiteLLM + Anthropic API + override） | [phase-2-t3.md](phase-2-t3.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T4 | `costCalculator.ts` を DB 参照版に置換 | [phase-2-t4.md](phase-2-t4.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T5 | `dashboardService.ts` の `COST_TABLE` 削除、`getCostRates` 委譲 | [phase-2-t5.md](phase-2-t5.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T6 | `server/src/lib/constants.ts` の `COST_RATES` 削除、frontend API 化 | [phase-2-t6.md](phase-2-t6.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T7 | `GET /api/dashboard/models` エンドポイント追加 | [phase-2-t7.md](phase-2-t7.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T8 | `ModelSimulationTable.tsx` を API fetch 版に | [phase-2-t8.md](phase-2-t8.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T9 | cron 組込み (setInterval + Docker build) | [phase-2-t9.md](phase-2-t9.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T10 | `handleStop` の model 上書きを unconditional に (#6) | [phase-2-t10.md](phase-2-t10.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T11 | admin UI で manual override 追加 | [phase-2-t11.md](phase-2-t11.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P2-T12 | `.env.example` に Phase 2 関連 env 追加 | [phase-2-t12.md](phase-2-t12.md) | [002](../specs/002-model-pricing-registry.md) |
| `[x]` | P1.5-T1 | `dashboardService.cacheEfficiency` 計算式修正 (#12) | [phase-1.5-t1.md](phase-1.5-t1.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T2 | 最終ターン `duration_ms` を transcript timestamp 優先 (#7) | [phase-1.5-t2.md](phase-1.5-t2.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T3 | turnIndex マッチに positional fallback 追加 (#2) | [phase-1.5-t3.md](phase-1.5-t3.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T4 | schema に `subagent_*_tokens` 分離カラム追加 (#4) | [phase-1.5-t4.md](phase-1.5-t4.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T5 | ダッシュボード集計を分離カラム体系に対応 | [phase-1.5-t5.md](phase-1.5-t5.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T6 | フロント KPI 表示「キャッシュヒット率」ラベル | [phase-1.5-t6.md](phase-1.5-t6.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P1.5-T7 | 各バグ単体テスト + 統合テスト追加 | [phase-1.5-t7.md](phase-1.5-t7.md) | [004](../specs/004-phase1-remaining-bugs.md) |
| `[x]` | P3-T1 | 新 repo 初期化 (monorepo ディレクトリ `installer/`) | [phase-3-t1.md](phase-3-t1.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T2 | `src/lib/settings-merger.ts` 実装 + テスト | [phase-3-t2.md](phase-3-t2.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T3 | `src/lib/paths.ts` 実装（OS 別パス解決） | [phase-3-t3.md](phase-3-t3.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T4 | `src/commands/install.ts` 実装 + 統合テスト | [phase-3-t4.md](phase-3-t4.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T5 | `src/commands/doctor.ts` | [phase-3-t5.md](phase-3-t5.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T6 | `src/commands/uninstall.ts` | [phase-3-t6.md](phase-3-t6.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T7 | `src/commands/config.ts` | [phase-3-t7.md](phase-3-t7.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T8 | hooks 実体を `setup/hooks/` から npm package へコピー | [phase-3-t8.md](phase-3-t8.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T9 | README（npx 使用例、トラブルシュート） | [phase-3-t9.md](phase-3-t9.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T10 | npm publish ワークフロー (GitHub Actions) | [phase-3-t10.md](phase-3-t10.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T11 | 既存 `setup/install-*.sh` をシム化 | [phase-3-t11.md](phase-3-t11.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T12 | 本 repo の README / CLAUDE.md を npx 中心に更新 | [phase-3-t12.md](phase-3-t12.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P3-T13 | 社内向け移行アナウンス文書 | [phase-3-t13.md](phase-3-t13.md) | [003](../specs/003-npx-installer.md) |
| `[x]` | P6-T1 | dedup hash を `messageId:requestId` に拡張 | [phase-6-t1.md](phase-6-t1.md) | [006](../specs/006-ccusage-alignment.md) |
| `[x]` | P6-T2 | `<synthetic>` model 除外 | [phase-6-t2.md](phase-6-t2.md) | [006](../specs/006-ccusage-alignment.md) |
| `[x]` | P6-T3 | healthcheck prefix を server 側で弾く + 既存削除 | [phase-6-t3.md](phase-6-t3.md) | [006](../specs/006-ccusage-alignment.md) |
| `[x]` | P5-T1 | `MemberCostBarChart.tsx` 新規 | [phase-5-t1.md](phase-5-t1.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P5-T2 | `SmallMultiplesTokens.tsx` 新規 | [phase-5-t2.md](phase-5-t2.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P5-T3 | `MemberTokensTable.tsx` 新規 | [phase-5-t3.md](phase-5-t3.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P5-T4 | `MembersPage.tsx` 統合 | [phase-5-t4.md](phase-5-t4.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P5-T5 | `TokensPage.tsx` 主軸 `$` + cache_read 除外 | [phase-5-t5.md](phase-5-t5.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P5-T6 | レガシー EJS 対応 | [phase-5-t6.md](phase-5-t6.md) | [005](../specs/005-meaningful-charts.md) |
| `[x]` | P9-T1 | TZ 集計バグ修正（dashboardService 全クエリ JST 集計化） | [phase-9-t1.md](phase-9-t1.md) | [009](../specs/009-timezone-aggregation.md) |

## 履歴

| 日付 | タスクID | 変更 |
|------|---------|------|
| 2026-04-25 | P1-T1〜P3-T13 | 新規登録（D-001〜D-005 承認後） |
| 2026-04-25 | P1-T1 | 進行中（サブエージェント起動） |
| 2026-04-27 | P9-T1 | 新規登録 → 即完了（D-015 既定方針 A、TZ 集計バグ修正） |
