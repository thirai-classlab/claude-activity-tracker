---
paths:
  - "server/src/middleware/**/*"
  - "server/src/routes/**/*"
  - "setup/hooks/shared/utils.js"
---

> 本プロジェクトは API キー認証（`X-API-Key`）でフック API を保護。Hook API 側は `API_KEY` 環境変数、クライアント側は `setup/hooks/config.json` の `api_key` に同じ値を設定する。詳細は下記。


# 認証ルール

## 認証プロバイダ

（NextAuth 等のプロバイダ構成、許可対象、ロール定義をここに記載）

## ミドルウェア

- 公開パス: （`/login`, `/api/auth` 等を列挙）
- 認可パス: （`/admin/*` など、特定ロールのみ許可するパスを列挙）
- モックモード時は認証スキップ
