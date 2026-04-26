# P3-T10: npm publish ワークフロー (GitHub Actions)

> **設計**: [003-npx-installer.md](../specs/003-npx-installer.md)
> **ステータス**: `[x]` 完了（2026-04-25、メインエージェント admin）

## 完了内容
- `.github/workflows/release-installer.yml` 新規
- トリガ: tag push (`installer-v*`) または `workflow_dispatch`
- Node 22 / `npm ci` / `tsc --noEmit` / `npm test` / `npm run build` / `npm publish --access public --provenance`
- `id-token: write` で provenance 対応
- 認証: `secrets.NPM_TOKEN`

## 運用
リリース時:
```bash
cd installer && npm version patch  # 0.1.0 → 0.1.1
git tag installer-v0.1.1
git push --tags
```
or GitHub UI から workflow_dispatch + version 指定。

## 申し送り
- `secrets.NPM_TOKEN` を GitHub repo settings で登録要
- `--provenance` のため OIDC 設定が必要（`id-token: write` 既に追加済み）
