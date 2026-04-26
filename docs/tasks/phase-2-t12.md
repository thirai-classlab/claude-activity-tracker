# P2-T12: `.env.example` に Phase 2 関連 env 追加

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **ステータス**: `[x]` 完了（2026-04-25、メインエージェント）

## 完了内容

`server/.env.example` に以下を追加:

- `ANTHROPIC_API_KEY`: 用途1 AI Chat、用途2 `/v1/models` verification（P2-T3）
- `COST_*_INPUT/OUTPUT`: manual_override に昇格して DB 反映される仕様を説明（P2-T3）
- `PRICING_SYNC_INTERVAL_SEC`: 料金同期 cron 間隔（既定 3600）(P2-T9)
- `PRICING_SYNC_DISABLED`: CI/offline 環境用の無効化フラグ（P2-T9）
- `LITELLM_PRICING_URL`: LiteLLM JSON URL のデバッグ上書き
- `NEXT_APP_DIR`: dist 構造変更後の Next.js パス解決 override（P2-T9）

## 残件（README 側）
- README.md に Phase 2 機能紹介（料金同期、manual override 画面）の記述追加は将来対応
- docs/specs/002 へのリンクのみ本タスクでは維持
