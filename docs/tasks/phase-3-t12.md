# P3-T12: 本 repo の README / CLAUDE.md を npx 中心に更新

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25/26、メインエージェント admin）

## 完了内容

### `README.md`
- クイックスタート冒頭に **npx ワンライナー推奨** ボックス追加
- ケース 3「新メンバー追加」を npx 推奨 + 従来手動を fallback 形式に書き換え
- 関連ドキュメント表に追加:
  - `installer/README.md`
  - `docs/specs/` 一覧
  - `docs/tasks/list.md`
  - `docs/decisions/`
  - `docs/announcements/`

### CLAUDE.md
- ユーザー側で簡略化された経緯あり → 過剰な追記は行わず最小限に留める
- 必要に応じて将来的に installer/ への参照を追加可能（ユーザー判断）
