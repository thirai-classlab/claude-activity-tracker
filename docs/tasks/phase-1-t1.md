# P1-T1: message.id dedup 付き parseTranscript 実装

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [tasks/](.) > **phase-1-t1.md**
> **設計**: [001-transcript-dedup.md](../specs/001-transcript-dedup.md)
> **ステータス**: `[x]` 完了（2026-04-25）

## 完了報告（サブエージェント a55a30ab3a07451a0）

- 実装: `setup/hooks/shared/utils.js` に `seenMessageIds` / `seenToolUseIds` と `isRealUserTurn()` 追加（約 90 行）
- テスト: `setup/hooks/tests/parseTranscript.test.js` 新規、U1〜U9 + 実 fixture 検証 = 10/10 pass
- fixture: `setup/hooks/tests/fixtures/sample.jsonl`（325 KB、実トランスクリプト）
- 設定: `vitest@^2.1.9` 追加、`npm test` で実行
- 実測: トークン合計が **3,343,490 → 1,769,373 (1.89x 縮小)**、spec 予測 1.95x と誤差 3% 以内
- 既存 hook スクリプトは無改修で動作継続

## スコープ

`setup/hooks/shared/utils.js` の `parseTranscript` を `message.id` で dedup するよう改修し、テストを追加する。

## 変更対象ファイル

- `setup/hooks/shared/utils.js` — `parseTranscript` 本体
- `setup/hooks/tests/parseTranscript.test.js` (新規) or 既存テストに追加

## 受入基準

- [ ] 同一 `message.id` の assistant 行が複数回あっても usage は 1 回のみ加算される
- [ ] 同一 `message.id` に text と tool_use が別行で現れた場合、text は結合、tool_use は 1 回のみ push される
- [ ] `message.id` 欠落行は従来どおり処理（フォールバック）
- [ ] user 行の `isToolResultOnly` 判定に system-reminder のみの text block も含める
- [ ] turnCount は真のユーザープロンプトのみで増える
- [ ] テスト U1〜U9（spec 001 参照）が全て緑
- [ ] 既存の fixture 3 本で inflation が 1.0x に落ちることを検証

## 依存

なし（Phase 1 の起点）。

## TDD 手順

1. テスト設計 → `/sc:test` or `tdd-guide` エージェントで U1〜U9 を洗い出し
2. テスト実装（Red）
3. `parseTranscript` 改修（Green）
4. Refactor

## サブエージェント委譲

メインエージェントは `setup/hooks/` を直接編集できない。`Agent` tool で `general-purpose` or `tdd-guide` 経由で実装。
