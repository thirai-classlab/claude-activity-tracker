# P3-T8: hooks 実体を `setup/hooks/` から `installer/hooks/` へコピー

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、メインエージェント admin work）

## 完了内容
- 6 hook script (aidd-log-session-start/end, prompt, stop, subagent-start/stop) を `installer/hooks/` にコピー
- `setup/hooks/shared/utils.js` を `installer/hooks/shared/utils.js` にコピー
- diff 検証: setup と installer 配下で完全一致

## 申し送り
- 将来的に `installer/hooks/` を SSOT 化し、`setup/hooks/` を symlink or generated 化を検討
- 当面は両ディレクトリを手動で同期する運用（hook 修正時は両方を更新）。`scripts/sync-installer-hooks.sh` のような同期スクリプト追加が望ましい
