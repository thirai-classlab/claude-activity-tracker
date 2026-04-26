# 判断待ち項目

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [decisions/](.) > **pending.md**

## 凡例

| 記号 | 意味 |
|------|------|
| 🟡 | 判断待ち（新規、3日以内） |
| 🟠 | 判断待ち（3日以上経過） |
| 🔴 | ブロッカー（他タスクを阻害している） |

---

## 現在の判断待ち項目

### D-016 / 2026-04-27 / 🟡

**項目**: per-API-call tiered pricing（200K 按分）実装可否

**背景**: 現状は modelId 全体で premium / standard 二択。1M context モードでは Anthropic は per-API-call の token 量で 200K 超分のみ tiered rate 課金。ccusage は per-call で按分実装。

**選択肢**:
- A. ccusage 完全準拠（per-call 計算、DB に `*_above_200k_per_mtok` 4 列追加、recalc）
- B. 現状維持（`[1m]` literal の有無で session 全体を分類）

**推奨（保留時の既定）**: B（現状で実害は小、要望次第で A に切替）

**ブロックされるタスク**: なし

**関連ドラフト / タスク**: [docs/draft/007-per-call-tiered-pricing.md](../draft/007-per-call-tiered-pricing.md)

### D-017 / 2026-04-27 / 🟡

**項目**: データ整合性監査の検出事項一括対応（Bug B/C/D/E/F/G/H/I/J/K/L）

**背景**: 包括監査で turn matching 時系列逆転（最大 26h 差）、tool_uses.executed_at 全件 NULL、turns.duration_ms 全件 NULL 等の 11 種を検出。多くは Bug B（turn matching）が原因で連鎖発生。

**選択肢**:
- A. draft 008 の方針で一括対応（B 修正で連鎖改善 + C 個別修正 + 監査スクリプト追加）
- B. 既存データはそのまま、新規データから自然修復を待つ

**推奨（保留時の既定）**: A（draft 008 の方針、CI 監査スクリプト含む）

**ブロックされるタスク**: なし（既存データ運用継続可能）

**関連ドラフト / タスク**: [docs/draft/008-data-integrity-audit.md](../draft/008-data-integrity-audit.md)

---

## 追加ルール

- 新規項目の番号は連番
- 判断が下ったら本ファイルから削除し、[`resolved.md`](resolved.md) へ移動
- 🟡 → 🟠 への格上げは Claude が自動で行う（3 日超判定）
- 🔴（ブロッカー）は他タスクに影響する場合に Claude が明示的に付与
- 保留時の既定方針で進めた場合、実装後に「この既定で進めた」旨を resolved.md に記録
