# Draft 009: タイムゾーン集計バグ（JST 表示で当日データが空）

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **009-timezone-aggregation.md**
> **ステータス**: 🟡 未承認
> **起票日**: 2026-04-27
> **背景**: ユーザー報告「27日になってまだ使っているのに、データがたまりません」

## 目次

- [診断結果](#診断結果)
- [根本原因](#根本原因)
- [選択肢](#選択肢)
- [推奨](#推奨)
- [タスク分解](#タスク分解)
- [既存データの扱い](#既存データの扱い)

---

## 診断結果

実データ確認 (2026-04-27 JST 03:41 = UTC 18:41 時点):

| 観測 | 値 |
|------|----|
| 過去 1h の turns 追加件数 | 33 件（最新 18:36 UTC） |
| 過去 1h の tool_uses 追加件数 | 1606 件（最新 18:35 UTC） |
| 過去 1h の subagents 起動 | 9 件 |
| 現セッション (8c6ad935) tokens | in 1250 / out 460572 / cw 5921094 / cr 279909734、15 turns |
| DB 集計の最新日付 | `2026-04-26` |

→ **データ自体は正常に流入している**。ダッシュボードで「27日のデータが無い」のは集計ロジックの問題。

## 根本原因

```
JST 04-27 03:41 = UTC 04-26 18:41
↓ Prisma DateTime → MariaDB DATETIME
↓ DATE(s.started_at) = '2026-04-26'
↓ frontend が「today = 2026-04-27 JST」でフィルタ
↓ マッチなし → 空表示
```

具体的には:
1. MariaDB は `@@time_zone = SYSTEM` (= UTC)
2. Prisma は Date を ISO string で渡す（UTC）
3. `dashboardService.ts` の 30+ クエリで `DATE(s.started_at)` を直接使用
4. 23-24 時台の JST 作業はすべて UTC 前日扱い

影響範囲（`dashboardService.ts`）:
- L340, L360, L361, L594, L604, L605, L982, L983, L1099, L1214, L1224, L1225, L1253, L1352, L1369, L1370, L1492, L1504, L1505, L1530, L1540, L1541
- L95, L99, L1178, L1182 のフィルタ条件 `started_at >= ?` も同根

## 選択肢

### 案 A: SQL レベルで `CONVERT_TZ` を全クエリに適用

```sql
-- before
DATE(s.started_at)
-- after
DATE(CONVERT_TZ(s.started_at, '+00:00', '+09:00'))
```

- フィルタ条件も `CONVERT_TZ(s.started_at, '+00:00', '+09:00') >= ?` に変更
- TZ は環境変数 `APP_TIMEZONE` (default `+09:00`) で外出し
- 既存データそのまま使える

**Pros**: ピンポイント修正、データ移行不要
**Cons**: 30+ 箇所の差し替え、テスト網羅必要

### 案 B: アプリ層で集計し直し

クエリは UTC のまま取得、Node 側で `Intl.DateTimeFormat({ timeZone: 'Asia/Tokyo' })` で日付グループを再計算。

**Pros**: SQL 変更最小
**Cons**: 大量データで N 倍メモリ、SUM/GROUP BY の SQL 最適化を失う

### 案 C: MariaDB のセッション TZ を JST に固定

`docker-compose.yml` で MariaDB に `--default-time-zone=+09:00`、Prisma 接続で `time_zone='+09:00'`。

**Pros**: SQL 変更ゼロ
**Cons**: DATETIME 値は wall-clock として保存される性質上、既存 UTC 値が「JST として再解釈される」。事実上、過去データすべての日時が 9 時間ずれる。recalc 必須かつ Prisma の Date 受け渡しと不整合。

## 推奨

**案 A**（SQL レベル `CONVERT_TZ`）。

理由:
- 案 B は性能劣化、案 C は既存データ破壊
- A は副作用が局所、`APP_TIMEZONE` で他地域チームに展開可能
- ccusage も同様に集計時 TZ 変換する設計（参考）

## タスク分解

承認後 `docs/tasks/list.md` に Phase 9 として登録予定:

- P9-T1: `dashboardService.ts` の helper 追加 — `tzDate(col)` macro で `DATE(CONVERT_TZ(col, '+00:00', :tz))` を一元化
- P9-T2: 30+ 箇所の `DATE(...)` を helper 経由に置換
- P9-T3: フィルタ条件 `started_at >= ?` も `CONVERT_TZ` 経由に変更（フロントから JST 文字列を受ける前提を維持）
- P9-T4: `APP_TIMEZONE` 環境変数化、デフォルト `+09:00`
- P9-T5: TZ 切り替えのスナップショットテスト追加（UTC / JST / EST 各日付境界）
- P9-T6: docs/known-issues.md に注意書き追加（既存 KPI レポートの数値は UTC 集計だった旨）

## 既存データの扱い

- 生データ（sessions / turns / tool_uses）は UTC のまま保持（変更なし）
- 集計結果のみ JST で再算出
- 過去日付の数値が 1 日分ずれる可能性（23-24 時台 JST 作業が前日 UTC → 当日 JST に再分類）
- KPI トレンドへの影響は軽微（日次集計が ±1 日シフトするのみ、合計値は不変）
