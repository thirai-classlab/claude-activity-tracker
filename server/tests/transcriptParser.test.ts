/**
 * Unit tests for `server/src/services/transcriptParser.ts`.
 *
 * Spec: docs/specs/001-transcript-dedup.md (U1 - U9)
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node 18+ built-in test runner (`node:test`) via tsx, so no extra
 * devDependency is required.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { parseTranscriptFile, type ParsedTranscript } from '../src/services/transcriptParser';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface AssistantRowOpts {
  messageId: string | null;
  requestId?: string | null;
  usage?: {
    input?: number;
    output?: number;
    cacheCreation?: number;
    cacheRead?: number;
  };
  model?: string;
  content: unknown[];
}

function assistantRow(opts: AssistantRowOpts): string {
  const message: Record<string, unknown> = {
    content: opts.content,
  };
  if (opts.messageId !== null) {
    message.id = opts.messageId;
  }
  if (opts.model) {
    message.model = opts.model;
  }
  if (opts.usage) {
    message.usage = {
      input_tokens: opts.usage.input ?? 0,
      output_tokens: opts.usage.output ?? 0,
      cache_creation_input_tokens: opts.usage.cacheCreation ?? 0,
      cache_read_input_tokens: opts.usage.cacheRead ?? 0,
    };
  }
  const entry: Record<string, unknown> = { type: 'assistant', message };
  // requestId lives at entry root (matches Claude Code transcript shape).
  if (opts.requestId !== undefined && opts.requestId !== null) {
    entry.requestId = opts.requestId;
  }
  return JSON.stringify(entry);
}

function textBlock(text: string): Record<string, unknown> {
  return { type: 'text', text };
}

function toolUseBlock(id: string, name: string, input: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: 'tool_use', id, name, input };
}

function userRowString(text: string): string {
  return JSON.stringify({ type: 'user', message: { content: text } });
}

function userRowBlocks(blocks: unknown[]): string {
  return JSON.stringify({ type: 'user', message: { content: blocks } });
}

function compactBoundaryRow(): string {
  return JSON.stringify({ type: 'compact_boundary' });
}

/**
 * Write lines to a tmp JSONL file, parse it, delete it, return the result.
 */
function parseLines(lines: string[]): ParsedTranscript {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-transcript-test-'));
  const file = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
  try {
    return parseTranscriptFile(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// U1: 同一 message.id が 3 行連続 → usage は 1 回だけ加算
// ---------------------------------------------------------------------------

test('U1: same message.id repeated 3 times → usage counted once', () => {
  const usage = { input: 100, output: 50, cacheCreation: 20, cacheRead: 10 };
  const requestId = 'req_abc';
  const lines = [
    assistantRow({
      messageId: 'msg_abc',
      requestId,
      usage,
      model: 'claude-sonnet-4-7',
      content: [textBlock('hello'), toolUseBlock('tool_1', 'Read', { file_path: '/a.ts' })],
    }),
    assistantRow({
      messageId: 'msg_abc',
      requestId,
      usage,
      model: 'claude-sonnet-4-7',
      content: [toolUseBlock('tool_2', 'Read', { file_path: '/b.ts' })],
    }),
    assistantRow({
      messageId: 'msg_abc',
      requestId,
      usage,
      model: 'claude-sonnet-4-7',
      content: [toolUseBlock('tool_3', 'Read', { file_path: '/c.ts' })],
    }),
  ];

  const result = parseLines(lines);

  assert.equal(result.tokens.input, 100, 'input tokens counted once');
  assert.equal(result.tokens.output, 50, 'output tokens counted once');
  assert.equal(result.tokens.cacheCreation, 20, 'cache_creation counted once');
  assert.equal(result.tokens.cacheRead, 10, 'cache_read counted once');
  assert.equal(result.tokens.totalInput, 100 + 20 + 10, 'totalInput = input + cacheCreation + cacheRead');
  // All 3 unique tool_use block ids should still be collected.
  assert.equal(result.toolUses.length, 3);
  assert.deepEqual(
    result.toolUses.map((t) => t.toolUseUuid).sort(),
    ['tool_1', 'tool_2', 'tool_3']
  );
});

// ---------------------------------------------------------------------------
// U2: 同一 message.id の text / tool_use が別行
//     → tool_use 1 回、text block は両行から拾える（重複カウントしない）
// ---------------------------------------------------------------------------

test('U2: same message.id split into text row and tool_use row → tool_use counted once, usage once', () => {
  const usage = { input: 80, output: 40 };
  const requestId = 'req_split';
  const lines = [
    assistantRow({
      messageId: 'msg_split',
      requestId,
      usage,
      content: [textBlock('I will read the file now.')],
    }),
    assistantRow({
      messageId: 'msg_split',
      requestId,
      usage,
      content: [toolUseBlock('tool_read_1', 'Read', { file_path: '/x.ts' })],
    }),
  ];

  const result = parseLines(lines);

  assert.equal(result.tokens.input, 80);
  assert.equal(result.tokens.output, 40);
  assert.equal(result.toolUses.length, 1);
  assert.equal(result.toolUses[0].toolUseUuid, 'tool_read_1');
  assert.equal(result.toolUses[0].toolName, 'Read');
});

// ---------------------------------------------------------------------------
// U3: tool_use 行に text が無く、text 専用行が後続（別 message.id）
//     → tool_use は重複しない、両行処理される
// ---------------------------------------------------------------------------

test('U3: tool_use row followed by text-only row (separate message ids) → no duplication', () => {
  const lines = [
    assistantRow({
      messageId: 'msg_A',
      requestId: 'req_A',
      usage: { input: 10, output: 5 },
      content: [toolUseBlock('tool_A', 'Grep', { pattern: 'foo' })],
    }),
    assistantRow({
      messageId: 'msg_B',
      requestId: 'req_B',
      usage: { input: 20, output: 15 },
      content: [textBlock('Here are the results.')],
    }),
  ];

  const result = parseLines(lines);

  assert.equal(result.tokens.input, 30);
  assert.equal(result.tokens.output, 20);
  assert.equal(result.toolUses.length, 1);
  assert.equal(result.toolUses[0].toolUseUuid, 'tool_A');
});

// ---------------------------------------------------------------------------
// U4: message.id 欠落行 → フォールバック（加算する、落とさない）
// ---------------------------------------------------------------------------

test('U4: missing message.id → fallback (count usage, do not drop the row)', () => {
  const lines = [
    assistantRow({
      messageId: null,
      usage: { input: 50, output: 25 },
      content: [toolUseBlock('tool_nomsg', 'Bash', { command: 'ls' })],
    }),
    assistantRow({
      messageId: null,
      usage: { input: 60, output: 30 },
      content: [toolUseBlock('tool_nomsg_2', 'Bash', { command: 'pwd' })],
    }),
  ];

  const result = parseLines(lines);

  // Without a message.id we cannot dedup safely, so usage MUST accumulate
  // (otherwise legacy transcripts without message.id would undercount).
  assert.equal(result.tokens.input, 110);
  assert.equal(result.tokens.output, 55);
  assert.equal(result.toolUses.length, 2);
});

// ---------------------------------------------------------------------------
// U5: user 行が system-reminder のみ → turnCount 増えない
// ---------------------------------------------------------------------------

test('U5: user row with system-reminder only → turnCount not incremented', () => {
  const lines = [
    userRowString('<system-reminder>\nInternal reminder text\n</system-reminder>'),
    userRowBlocks([textBlock('<system-reminder>a</system-reminder>')]),
  ];

  const result = parseLines(lines);

  assert.equal(result.turnCount, 0);
});

// ---------------------------------------------------------------------------
// U6: user 行が tool_result のみ → turnCount 増えない
// ---------------------------------------------------------------------------

test('U6: user row with tool_result only → turnCount not incremented', () => {
  const lines = [
    userRowBlocks([
      { type: 'tool_result', tool_use_id: 'tool_1', content: 'ok' },
      { type: 'tool_result', tool_use_id: 'tool_2', content: 'ok' },
    ]),
  ];

  const result = parseLines(lines);

  assert.equal(result.turnCount, 0);
});

// ---------------------------------------------------------------------------
// U7: user 行が通常プロンプト + system-reminder 混在 → turnCount +1
// ---------------------------------------------------------------------------

test('U7: user row mixing real prompt with system-reminder → turnCount +1', () => {
  const lines = [
    userRowBlocks([
      textBlock('<system-reminder>injected</system-reminder>'),
      textBlock('Please refactor this function.'),
    ]),
    userRowString('Another real prompt.'),
  ];

  const result = parseLines(lines);

  assert.equal(result.turnCount, 2);
});

// ---------------------------------------------------------------------------
// U8: compact_boundary を跨いでも dedup 連続性がある
// ---------------------------------------------------------------------------

test('U8: dedup state persists across compact_boundary', () => {
  const usage = { input: 100, output: 50 };
  const lines = [
    assistantRow({
      messageId: 'msg_X',
      requestId: 'req_X',
      usage,
      content: [toolUseBlock('tool_X', 'Read', { file_path: '/a.ts' })],
    }),
    compactBoundaryRow(),
    // Same (message.id, requestId) hash replays after compact boundary — duplicate.
    assistantRow({
      messageId: 'msg_X',
      requestId: 'req_X',
      usage,
      content: [toolUseBlock('tool_X', 'Read', { file_path: '/a.ts' })],
    }),
    assistantRow({
      messageId: 'msg_Y',
      requestId: 'req_Y',
      usage: { input: 200, output: 80 },
      content: [toolUseBlock('tool_Y', 'Bash', { command: 'echo hi' })],
    }),
  ];

  const result = parseLines(lines);

  // msg_X usage counted once, msg_Y usage counted once
  assert.equal(result.tokens.input, 100 + 200);
  assert.equal(result.tokens.output, 50 + 80);
  assert.equal(result.toolUses.length, 2);
  assert.equal(result.compactCount, 1);
});

// ---------------------------------------------------------------------------
// U9: 同一 tool_use.id が別 message.id で再出現 → block.id dedup で 1 回のみ
// ---------------------------------------------------------------------------

test('U9: same tool_use.id across distinct message.ids → tool_use deduped by block.id', () => {
  const lines = [
    assistantRow({
      messageId: 'msg_1',
      requestId: 'req_1',
      usage: { input: 10, output: 5 },
      content: [toolUseBlock('tool_dup', 'Read', { file_path: '/a.ts' })],
    }),
    assistantRow({
      messageId: 'msg_2',
      requestId: 'req_2',
      usage: { input: 10, output: 5 },
      content: [toolUseBlock('tool_dup', 'Read', { file_path: '/a.ts' })],
    }),
  ];

  const result = parseLines(lines);

  // Both messages have distinct ids → both usage entries count.
  assert.equal(result.tokens.input, 20);
  assert.equal(result.tokens.output, 10);
  // But the tool_use id is identical → only one tool_use entry.
  assert.equal(result.toolUses.length, 1);
  assert.equal(result.toolUses[0].toolUseUuid, 'tool_dup');
});

// ---------------------------------------------------------------------------
// Regression: basic happy path still works end-to-end
// ---------------------------------------------------------------------------

test('regression: end-to-end parse extracts tokens, tools, file changes, turns', () => {
  const lines = [
    userRowString('Refactor transcriptParser.'),
    assistantRow({
      messageId: 'msg_r1',
      usage: { input: 120, output: 40, cacheCreation: 5, cacheRead: 15 },
      model: 'claude-sonnet-4-7',
      content: [
        textBlock('I will edit the file.'),
        toolUseBlock('t_edit', 'Edit', { file_path: '/srv/x.ts' }),
        toolUseBlock('t_read', 'Read', { file_path: '/srv/y.ts' }),
      ],
    }),
    userRowBlocks([
      { type: 'tool_result', tool_use_id: 't_edit', content: 'ok' },
      { type: 'tool_result', tool_use_id: 't_read', content: 'ok' },
    ]),
  ];

  const result = parseLines(lines);

  assert.equal(result.turnCount, 1, 'tool_result-only user row does not bump turnCount');
  assert.equal(result.tokens.input, 120);
  assert.equal(result.tokens.output, 40);
  assert.equal(result.tokens.totalInput, 120 + 5 + 15);
  assert.equal(result.model, 'claude-sonnet-4-7');
  assert.equal(result.toolUses.length, 2);
  assert.ok(
    result.fileChanges.some((fc) => fc.filePath === '/srv/x.ts' && fc.operation === 'edit')
  );
  assert.ok(
    result.fileChanges.some((fc) => fc.filePath === '/srv/y.ts' && fc.operation === 'read')
  );
});

// ---------------------------------------------------------------------------
// Regression: non-existent file returns empty result, does not throw
// ---------------------------------------------------------------------------

test('regression: missing file path returns empty ParsedTranscript', () => {
  const result = parseTranscriptFile('/does/not/exist/at/all.jsonl');
  assert.equal(result.tokens.input, 0);
  assert.equal(result.toolUses.length, 0);
  assert.equal(result.turnCount, 0);
});

// ---------------------------------------------------------------------------
// Regression: parseTranscriptFile signature is preserved
// ---------------------------------------------------------------------------

test('regression: parseTranscriptFile signature preserved', () => {
  // Type-level smoke: one positional arg, returns ParsedTranscript.
  const fn: (p: string) => ParsedTranscript = parseTranscriptFile;
  assert.equal(typeof fn, 'function');
  assert.equal(fn.length, 1);
});

// ---------------------------------------------------------------------------
// ccusage alignment (spec 006)
// ---------------------------------------------------------------------------

test('U10: same message.id with different requestIds → counted as separate entries', () => {
  // ccusage uses `${message.id}:${requestId}` as the dedup hash. Same
  // message.id replayed under a new requestId is a legitimate distinct
  // accounting unit (e.g. retried API call) and must accumulate.
  const lines = [
    assistantRow({
      messageId: 'msg_RETRY',
      requestId: 'req_001',
      usage: { input: 50, output: 25 },
      content: [textBlock('first attempt')],
    }),
    assistantRow({
      messageId: 'msg_RETRY',
      requestId: 'req_002',
      usage: { input: 50, output: 25 },
      content: [textBlock('retry attempt')],
    }),
  ];

  const result = parseLines(lines);

  // Both rows count: 2x usage.
  assert.equal(result.tokens.input, 100);
  assert.equal(result.tokens.output, 50);
});

test('U10b: same message.id + same requestId still deduped within one entry', () => {
  const usage = { input: 10, output: 20 };
  const lines = [
    assistantRow({
      messageId: 'msg_DUP',
      requestId: 'req_X',
      usage,
      content: [textBlock('block 1')],
    }),
    assistantRow({
      messageId: 'msg_DUP',
      requestId: 'req_X',
      usage,
      content: [toolUseBlock('tu_1', 'Bash', { command: 'ls' })],
    }),
  ];

  const result = parseLines(lines);

  assert.equal(result.tokens.input, 10);
  assert.equal(result.tokens.output, 20);
});

test('U10c: requestId missing on one row → falls back to legacy "always count"', () => {
  // Mixed presence: one row has requestId, the other does not. Hash returns
  // null when either id is missing → both rows count.
  const lines = [
    assistantRow({
      messageId: 'msg_PARTIAL',
      requestId: 'req_a',
      usage: { input: 5, output: 5 },
      content: [textBlock('a')],
    }),
    assistantRow({
      messageId: 'msg_PARTIAL',
      // requestId omitted → null hash → not deduped
      usage: { input: 5, output: 5 },
      content: [textBlock('b')],
    }),
  ];

  const result = parseLines(lines);

  assert.equal(result.tokens.input, 10);
  assert.equal(result.tokens.output, 10);
});

test('synthetic: <synthetic> model rows are skipped (no usage, no tool_use)', () => {
  const lines = [
    assistantRow({
      messageId: 'msg_real',
      requestId: 'req_real',
      model: 'claude-sonnet-4-7',
      usage: { input: 100, output: 50 },
      content: [textBlock('real response')],
    }),
    assistantRow({
      messageId: 'msg_synth',
      requestId: 'req_synth',
      model: '<synthetic>',
      usage: { input: 9999, output: 9999, cacheCreation: 9999, cacheRead: 9999 },
      content: [toolUseBlock('tu_synth', 'Bash', { command: 'rm -rf /' })],
    }),
  ];

  const result = parseLines(lines);

  // Only the real assistant row is counted.
  assert.equal(result.tokens.input, 100);
  assert.equal(result.tokens.output, 50);
  assert.equal(result.tokens.cacheCreation, 0);
  assert.equal(result.tokens.cacheRead, 0);
  // Synthetic tool_use must not be pushed.
  assert.equal(result.toolUses.length, 0);
  // Result-level model must NOT be overwritten by '<synthetic>'.
  assert.equal(result.model, 'claude-sonnet-4-7');
});
