# P2-T10: `handleStop` の model 上書きを unconditional に（バグ #6）

> **設計**: [002-model-pricing-registry.md](../specs/002-model-pricing-registry.md)
> **ステータス**: `[x]` 完了（2026-04-25、サブエージェント a6023bfd734a5f021）

## 背景

`hookService.ts` `handleStop` の session.update で `...(data.model ? { model: data.model } : {})` と書かれており、`data.model` が falsy のときのみスキップ。実トランスクリプトは `claude-opus-4-7` を返しているのに session.model が `claude-opus-4-6`（セッション開始時スナップショット）のまま更新されないケースが発生していた。

## 完了内容

### 実装
- `server/src/services/hookService.ts`:
  - `resolveSessionModelUpdate(dataModel)` pure helper を新規 export
  - `'unknown'` / 空文字 / null / undefined → `{}`（既存値保持）
  - それ以外の文字列 → `{ model: dataModel }`（必ず上書き）
- `handleStop` の session.update data 内で `...sessionModelUpdate` を展開

### テスト
- `server/tests/hookService.test.ts` 新規、単体 7 ケース:
  1. 実モデル名で上書き
  2. 旧モデル名から新モデル名への更新（バグ #6 直接検証）
  3. sonnet / haiku / 日付付きバリアントも通る
  4. `'unknown'` で既存値保持
  5. `undefined` / `null` / `''` で既存値保持
- 結果: **42/42 pass**（既存 35 + 新規 7）
- `tsc --noEmit -p tsconfig.server.json`: clean

### 副作用
- 従来は truthy チェックだったため `'unknown'` がそのまま DB に書き込まれていた → むしろバグ修正

## 申し送り（後続タスクへ）

- `handleSubagentStop` の `data.agent_model || 'unknown'` も同種の問題を抱えている可能性 → Phase 1.5（draft 004）または別ドラフトで対応検討
- `session.model` が null のセッションで `data.model='unknown'` のときフォールバックで何を書くかは P2 後続（Anthropic `/v1/models` 参照時）で追加検討
