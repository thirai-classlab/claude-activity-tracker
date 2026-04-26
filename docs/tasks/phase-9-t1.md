# P9-T1: タイムゾーン集計バグ修正（dashboardService 全クエリ）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [tasks/](.) > **phase-9-t1.md**
> **設計**: [`docs/specs/009-timezone-aggregation.md`](../specs/009-timezone-aggregation.md)
> **判断**: D-015（resolved.md 参照）
> **ステータス**: ✅ 完了（2026-04-27）

## 背景

ユーザー報告「27日のデータがたまらない」。診断結果、データ流入は正常（過去 1h で turns 33 / tool_uses 1606 件）だったが、`dashboardService.ts` が UTC で `DATE(s.started_at)` を実行しているため、JST 23-24 時台の作業が前日 UTC に分類され、ダッシュボード上で「今日」が空になっていた。

## 実装内容

1. `dashboardService.ts` に `APP_TIMEZONE` env helper を追加
2. `tzExpr(col)` / `tzDate(col)` / `getAppTimezone()` を追加
3. 集計用 `DATE(s.started_at)` 22 箇所を `tzDate('s.started_at')` に置換
4. `DAYOFWEEK` / `HOUR` 2 箇所を `tzExpr` 経由に変更
5. フィルタ条件 `started_at >= ? <= ?` 4 箇所を `tzExpr` 経由に変更
6. `server/tests/dashboardService.timezone.test.ts` 新規 4 ケース

## 結果

- 合計 `tzDate|tzExpr` 出現: 29 箇所（3 declarations + 26 call-sites）
- `npm test`: 147 passed / 0 failed
- `tsc --noEmit -p tsconfig.server.json`: clean
- E2E 確認: `GET /api/dashboard/daily?from=2026-04-27&to=2026-04-27` が 4 セッションを正しく返却

## 申し送り

- `server/.env.example` に `APP_TIMEZONE` を追記（メイン側で対応済み）
- `dashboardService.ts` 以外（`analysisService.ts` 等）の生 SQL は今回スコープ外
- サマータイム導入地域では `Asia/Tokyo` 等のネーム変換が必要（現実装は `+09:00` 固定オフセット）
