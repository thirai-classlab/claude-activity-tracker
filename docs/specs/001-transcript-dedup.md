# Draft 001: トランスクリプト二重計上の解消

> **パンくず**: [README.md](../../README.md) > [docs/](..) > [draft/](.) > **001-transcript-dedup.md**
> **ステータス**: 🟡 未承認（レビュー依頼中）
> **起票日**: 2026-04-25
> **関連バグ**: #1 (トランスクリプト二重計上), #10 (turn_count/tool_use_count 膨張), #13 (サーバ側パーサ同バグ), #14 (turn_count 無変換採用)

## 目次

- [問題](#問題)
- [原因](#原因)
- [解決方針](#解決方針)
- [実装設計](#実装設計)
- [テスト設計](#テスト設計)
- [移行・バックフィル](#移行バックフィル)
- [リスクと回避策](#リスクと回避策)
- [タスク分解](#タスク分解)
- [参考文献](#参考文献)

---

## 問題

ダッシュボード上のトークン・コスト・ターン数・ツール利用数が**実測 1.7〜2.0 倍、最大 62 倍**インフレしている。

### 観測事実

| セッション | `session.turn_count` | 実 turns 行数 | インフレ率 |
|-----------|---------------------|--------------|-----------|
| 28 | 99 | 3 | 33x |
| 19 | 925 | 36 | 26x |
| 18 | 1059 | 17 | **62x** |
| 26 | 316 | 8 | 39x |

| トランスクリプトファイル | assistant 行数 | 一意 message.id | インフレ率 |
|--------------------|--------------|---------------|-----------|
| 5f61e000...jsonl | 37 | 19 | **1.95x** |
| 8c6ad935...jsonl | 63 | 37 | 1.70x |
| 93732d0c...jsonl | 282 | 166 | 1.70x |

被害範囲:
- `sessions.total_input_tokens` / `total_output_tokens` / `total_cache_*_tokens`
- `sessions.estimated_cost`（DB 保存額 ≈ 2x 実費）
- `sessions.turn_count` / `tool_use_count`
- `turns.input_tokens` など per-turn 集計
- `subagents.*_tokens` / `subagents.estimated_cost`
- 全ダッシュボード（Prompt Feed / Productivity / Member / Repo / Tokens / Cost）

## 原因

Claude Code のトランスクリプト（JSONL）は、1 API コール内で `text + tool_use + tool_use + ...` のように複数 content block を返す場合、**同一 `message.id` を持つ assistant 行を block 数だけ書き出す**。各行は同じ `usage` を保持。

パーサ（`setup/hooks/shared/utils.js` L478-491 と `server/src/services/transcriptParser.ts` L133-136）は、重複排除せずに `+=` で加算しているため、1 API コールのトークンが **N 回カウント** される。

同じ原因で:
- `result.turnCount++`（`shared/utils.js` L564）: 合成 user メッセージ（system-reminder、resume/compact 由来）が `isToolResultOnly` 判定をすり抜けて過剰カウント
- `result.toolUses.push(...)`（L515）: tool_use block ごとに push されるため、同一 block の再エントリで重複

## 解決方針

### コア原則

**トランスクリプトの全行走査時に、各 `message.id` の usage / tool_use は「最初に出現したもの」だけを採用する**。

- Anthropic API は同一リクエストの usage を全 block の同じ行に複製しているだけ。1 行目を採用すればよい。
- tool_use の `block.id` は Anthropic 側で一意に採番されるので、`message.id` が重複しても block.id で最終的には一意。`message.id` で dedup すれば tool_use も自動的に一意になる。

### サイドイフェクトで自動解消

- `turnCount`: assistant side の dedup は user side に影響しない。別途 user メッセージ側の真ターン判定ロジックを強化（後述）。
- `turn_count` / `tool_use_count` カラム: 同じパーサを通るため自動修正される。

## 実装設計

### 共有 dedup ロジック

- **設置場所**: `setup/hooks/shared/utils.js` 内の純関数として export
- **サーバ側**: `server/src/services/transcriptParser.ts` から上記を参照（または同一ロジックを再実装）。将来の統合用に hook 側のコードを `server/src/hooks-shared/` へ symlink or コピーする選択肢も検討。

### `parseTranscript` の改修

```
[parseTranscript 改修ポイント（擬似コード）]

seenMessageIds = new Set()
seenToolUseIds = new Set()

for line in lines:
  obj = JSON.parse(line)
  if obj.type == 'assistant':
    msgId = obj.message?.id
    if msgId is None:
      # フォールバック: id が欠けている行は従来どおり処理（安全側）
      process_assistant_legacy(obj)
      continue

    if msgId in seenMessageIds:
      # 重複行はスキップ（usage 加算も tool_use push もしない）
      # ただし text block は「初回に出なかった」可能性があるので、
      # text block のみは追加で拾う（stop_reason='tool_use' 時に text が先、
      # tool_use が後の 2 行に分かれる Claude Code の挙動を保護）
      append_text_blocks_only(obj)
      continue

    seenMessageIds.add(msgId)
    # usage は初回のみ加算
    add_usage(obj.message.usage)
    # tool_use も初回のみ（念のため block.id でもチェック）
    for block in content:
      if block.type == 'tool_use' and block.id not in seenToolUseIds:
        seenToolUseIds.add(block.id)
        push_tool_use(block)
      elif block.type == 'text':
        append_text(block)
```

### ターン境界の判定強化（#14, #10 の残り対応）

現状の `isToolResultOnly` 判定を以下に拡張:

```
user 行を「新ターン開始」と判定する条件:
  - content が文字列で system-reminder で始まらない、または
  - content が配列で、tool_result 以外の text block が少なくとも 1 つあり、
    かつ全 text block が system-reminder で始まるわけではない

それ以外（tool_result のみ、system-reminder のみ、hook 結果のみ）は
「現ターン継続」として turnCount を増やさない
```

さらに `handleStop` 側の session 保存時は `data.turn_count` を信用せず:

```
turnCount: await prisma.turn.count({ where: { sessionId } })
toolUseCount: await prisma.toolUse.count({ where: { sessionId, subagentId: null } })
```

で DB 実数に置き換える（既に `subagentCount` は DB 実数）。

### サーバ側パーサ（`transcriptParser.ts`）

同様の dedup を移植。現状は開発/テスト用途と明記されているが、将来のバックフィル CLI で使うため同じ挙動にしておく。

## テスト設計

TDD で進める。テスト専門エージェント（`/sc:test`）にパターン洗い出しを依頼 → 以下の Red テストから実装。

### 単体テスト（`parseTranscript`）

| # | ケース | 期待挙動 |
|---|--------|---------|
| U1 | 同一 message.id が 3 行連続 | usage は 1 回だけ加算 |
| U2 | 同一 message.id の text / tool_use が別行 | tool_use は 1 回 push、text は全て結合 |
| U3 | tool_use 行に text が無く、text 専用行が後続 | 両方の text を結合、tool_use は重複しない |
| U4 | message.id 欠落行 | フォールバックで従来処理（回帰なし） |
| U5 | user 行が system-reminder のみ | turnCount 増えない |
| U6 | user 行が tool_result のみ | turnCount 増えない |
| U7 | user 行が通常プロンプト + system-reminder 混在 | turnCount +1 |
| U8 | compact_boundary を跨ぐ転写 | dedup が分断されず、全体で message.id ごとに一意 |
| U9 | 同一 tool_use.id が重複（異常系） | block.id dedup で 1 回のみ |

### 統合テスト（実トランスクリプト）

- 既存ローカル jsonl 3 本を fixture 化 → パース前後でトークン比較、差分が観測インフレ率と一致することを検証
- `handleStop` E2E: fixture を post → DB の session / turn / subagent 集計が期待値と一致

### 回帰テスト

- Prompt Feed API: ターン毎トークンが 0 でないこと
- Productivity API: `avg_turns` が現実的な値（1 セッション平均 1〜50 程度）

## 移行・バックフィル

既存 DB の数値は壊れている。以下の 2 択:

### 案 A: 再計算スクリプト（推奨）

`scripts/backfill-transcript.ts` を新規作成:

```
1. sessions.session_uuid から transcriptPath を推定
   (~/.claude/projects/<slug>/<uuid>.jsonl)
2. ユーザーの PC 上にしか無いため、運用担当者が各メンバー PC で
   `node scripts/backfill-transcript.js` を実行し結果を API 送信
   （または stop hook を手動で再発火）
3. サーバ側に POST /api/hook/rebuild-session エンドポイントを追加、
   stop hook と同じロジックで集計を再構築
```

### 案 B: 全データ破棄して次回から正規値

運用判断。社内で過去分の KPI 継続性が不要なら最も安全。

**推奨**: 案 A を用意しつつ、既存データは「計測不能期間」として注釈で扱う。社内メンバーに「過去の数値は ~2x 膨張していた」ことを通知。

## リスクと回避策

| リスク | 影響 | 回避策 |
|--------|------|--------|
| dedup が過剰で本来別扱いすべき行を潰す | トークン過小計上 | `message.id` が同値なら同一 API レスポンスという Anthropic 仕様を根拠に、U1〜U9 のテストで保証 |
| フック側と server 側でロジックが drift | 再発 | `shared/utils.js` をサーバ側からも参照するか、両方で同一テストフィクスチャを実行 |
| 既存データ再計算中に新規 hook が競合 | race | バックフィル時は session_id 単位で `SELECT ... FOR UPDATE` |
| `docs/draft/` 時点で実装先行のリスク | ルール違反 | 本 draft の承認後にのみ `docs/tasks/list.md` へ登録 |

## タスク分解

承認後 `docs/tasks/list.md` に以下を登録予定:

- T1: `shared/utils.js` に dedup 付き `parseTranscript` 実装 + テスト（U1〜U9）
- T2: `server/src/services/transcriptParser.ts` を同ロジックで移植
- T3: `handleStop` の turnCount / toolUseCount を DB 実数に切り替え
- T4: 既存 fixture でインフレ率が観測値と一致することを E2E 検証
- T5: `scripts/backfill-transcript.ts` 実装（案 A）
- T6: 本番 1 セッションでバックフィル試走 → 差分レビュー
- T7: 運用担当者へ過去データの注意喚起ドキュメント追加

## 参考文献

- [Anthropic Messages API — Usage object](https://docs.anthropic.com/en/api/messages) — `usage` フィールド仕様、cache_creation / cache_read の課金挙動
- `server/src/services/hookService.ts` L375-424 — 集計ロジック（turn マッチング含む）
- `setup/hooks/shared/utils.js` L391-622 — 現行 parseTranscript 実装
