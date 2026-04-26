# P3-T11: 既存 `setup/install-*.sh` をシム化

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、メインエージェント admin）

## 完了内容
- 旧スクリプト 4 本を `setup/old/*.legacy.{sh,ps1}` に保存
- 新スクリプト 4 本（install-mac.sh, install-win.ps1, uninstall-mac.sh, uninstall-win.ps1）を npx shim に置換
- `--legacy` (PowerShell では `-Legacy`) フラグで旧挙動にフォールバック可能
- npx 不在時は明示エラー

## シム動作
```bash
bash setup/install-mac.sh
# → npx @classlab/claude-activity-tracker-hooks install

bash setup/install-mac.sh --legacy
# → setup/old/install-mac.legacy.sh をそのまま実行
```
