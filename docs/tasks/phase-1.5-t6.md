# P1.5-T6: フロント KPI ラベル「キャッシュヒット率」+ % 表示

> **設計**: [004-phase1-remaining-bugs.md](../specs/004-phase1-remaining-bugs.md)
> **依存**: P1.5-T1 完了
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント af0142d61a7a27af5）

## 完了内容
- `server/src/components/pages/tokens/TokensPage.tsx`: ラベル更新 + `[0,1]` クランプ + % 表示
- `server/public/js/dashboard.js`: ラベル更新 + 計算式の分母から output 除外（P1.5-T1 と同期）+ `[0,100]` クランプ
- 全 grep で UI ソースから「キャッシュ効率/Cache効率」消滅（fixture jsonl のプロンプト本文のみ残存）
- tsc clean（Next.js / server 両方）

## 注意
- レガシー JS の計算式が変わったため、`/legacy` を見ているユーザーには数値の見え方が変化する（バグ修正の意図に合致）
