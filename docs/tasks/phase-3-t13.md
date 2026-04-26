# P3-T13: 社内向け移行アナウンス文書（npx インストーラ導入）

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、メインエージェント admin）

## 完了内容
- [`docs/announcements/2026-04-npx-installer.md`](../announcements/2026-04-npx-installer.md) 新規
- 3 行まとめ / 利用方法（対話・非対話）/ 設定変更コマンド / 旧新比較表 / 既存ユーザー影響 / FAQ 5 件
- 既存告知（[`2026-04-data-correction.md`](../announcements/2026-04-data-correction.md)）と相互リンク

## 残件
- npm publish 後（P3-T10）に「v0.1.0 リリース完了」追記
- `setup/install-*.sh` シム化（P3-T11）後に「旧スクリプトは shim に置換済み」追記
