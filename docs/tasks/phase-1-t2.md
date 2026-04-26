# P1-T2: `server/src/services/transcriptParser.ts` 同ロジック移植

> **設計**: [001-transcript-dedup.md](../specs/001-transcript-dedup.md) | **依存**: P1-T1
> **ステータス**: `[x]` 完了（2026-04-25）

## 完了報告（サブエージェント ace0d1816ea127e7b）

- 実装: `server/src/services/transcriptParser.ts` に `DedupContext` (`seenMessageIds` / `seenToolUseIds`) を `parseTranscriptFile` スコープで導入。`processAssistantEntry` で message.id dedup、content blocks は重複行でも走査し `tool_use` を `block.id` で二重チェック
- ターン境界: `processUserEntry` で system-reminder プレフィクスと tool_result のみ行を新ターン扱いしない
- テスト: `server/tests/transcriptParser.test.ts` 新規、U1〜U9 + regression 3 件 = **12/12 pass**
- ランナー: Node 22 組み込み `node:test` を `tsx` 経由で実行（新規 devDep なし）。`package.json` に `"test": "node --import tsx --test tests/**/*.test.ts"` 追加
- TypeScript: `tsc --noEmit` を両 tsconfig で確認、エラーなし
- 影響調査: `parseTranscriptFile` / `ParsedTranscript` / `ParsedToolUse` への外部参照なし（将来バックフィル CLI 用の温存実装。`hookService.ts` は未使用）

## 残注意

- `@esbuild/darwin-arm64` を `--no-save` 追加で環境合わせ。CI/Linux では別途 optional deps or ネイティブ `node --experimental-strip-types` 経由を検討（本タスクのスコープ外、別チケット化候補）
