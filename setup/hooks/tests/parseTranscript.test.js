/**
 * parseTranscript unit tests (U1-U9)
 *
 * Covers the message.id dedup + enhanced turn-boundary detection required
 * by docs/specs/001-transcript-dedup.md.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');


const { parseTranscript } = require('../shared/utils');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function asst({ id, usage, content = [], stopReason = null, model = 'claude-sonnet-4-5', timestamp = '2025-01-01T00:00:00.000Z', requestId }) {
  const entry = {
    type: 'assistant',
    timestamp,
    message: {
      id,
      role: 'assistant',
      model,
      stop_reason: stopReason,
      usage,
      content,
    },
  };
  if (requestId !== undefined) entry.requestId = requestId;
  return JSON.stringify(entry);
}

function user(content) {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content },
  });
}

function sys(subtype, extra = {}) {
  return JSON.stringify({ type: 'system', subtype, ...extra });
}

function usage({ input = 10, output = 20, cacheCreation = 30, cacheRead = 40 } = {}) {
  return {
    input_tokens: input,
    output_tokens: output,
    cache_creation_input_tokens: cacheCreation,
    cache_read_input_tokens: cacheRead,
  };
}

let tmpFiles = [];
function writeTranscript(lines) {
  const p = path.join(os.tmpdir(), `parseTranscript-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
  tmpFiles.push(p);
  return p;
}

beforeEach(() => { tmpFiles = []; });
afterEach(() => {
  for (const p of tmpFiles) {
    try { fs.unlinkSync(p); } catch {}
  }
});

describe('parseTranscript - message.id dedup', () => {
  test('U1: same message.id over 3 rows adds usage only once', () => {
    const requestId = 'req_A';
    const lines = [
      user('first prompt'),
      asst({ id: 'msg_A', requestId, usage: usage({ input: 10, output: 20, cacheCreation: 30, cacheRead: 40 }), content: [{ type: 'thinking' }] }),
      asst({ id: 'msg_A', requestId, usage: usage({ input: 10, output: 20, cacheCreation: 30, cacheRead: 40 }), content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }] }),
      asst({ id: 'msg_A', requestId, usage: usage({ input: 10, output: 20, cacheCreation: 30, cacheRead: 40 }), content: [{ type: 'tool_use', id: 'tu_2', name: 'Bash', input: { command: 'pwd' } }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(10);
    expect(result.tokens.output).toBe(20);
    expect(result.tokens.cacheCreation).toBe(30);
    expect(result.tokens.cacheRead).toBe(40);
    expect(result.tokens.totalInput).toBe(10 + 30 + 40);
  });

  test('U2: text + tool_use in separate rows: tool_use pushed once, text joined', () => {
    const requestId = 'req_B';
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_B',
        requestId,
        usage: usage({ input: 5, output: 10 }),
        content: [{ type: 'text', text: 'I will run a command.' }],
      }),
      asst({
        id: 'msg_B',
        requestId,
        usage: usage({ input: 5, output: 10 }),
        content: [{ type: 'tool_use', id: 'tu_A', name: 'Bash', input: { command: 'ls' } }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(5);
    expect(result.tokens.output).toBe(10);
    expect(result.toolUses.length).toBe(1);
    expect(result.toolUses[0].id).toBe('tu_A');
    expect(result.responseTexts.length).toBe(1);
    expect(result.responseTexts[0].text).toContain('I will run a command.');
  });

  test('U3: tool_use row then text-only row: both text captured, tool_use not duplicated', () => {
    const requestId = 'req_C';
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_C',
        requestId,
        usage: usage({ input: 7, output: 14 }),
        content: [{ type: 'tool_use', id: 'tu_X', name: 'Read', input: { file_path: '/tmp/x' } }],
      }),
      asst({
        id: 'msg_C',
        requestId,
        usage: usage({ input: 7, output: 14 }),
        content: [{ type: 'text', text: 'Here is the summary.' }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(7);
    expect(result.tokens.output).toBe(14);
    expect(result.toolUses.length).toBe(1);
    expect(result.responseTexts[0].text).toContain('Here is the summary.');
  });

  test('U4: missing message.id falls back to legacy path', () => {
    const lines = [
      user('prompt'),
      asst({ id: undefined, usage: usage({ input: 3, output: 6 }), content: [{ type: 'text', text: 'hello' }] }),
      asst({ id: undefined, usage: usage({ input: 3, output: 6 }), content: [{ type: 'text', text: 'world' }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(6);
    expect(result.tokens.output).toBe(12);
  });

  test('U5: user row with only system-reminder text does not increment turnCount', () => {
    const lines = [
      user('real prompt'),
      asst({ id: 'msg_1', usage: usage(), content: [{ type: 'text', text: 'ok' }] }),
      user([{ type: 'text', text: '<system-reminder>reminder body</system-reminder>' }]),
      asst({ id: 'msg_2', usage: usage(), content: [{ type: 'text', text: 'done' }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.turnCount).toBe(1);
  });

  test('U6: user row with only tool_result blocks does not increment turnCount', () => {
    const lines = [
      user('real prompt'),
      asst({ id: 'msg_1', usage: usage(), content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }] }),
      user([{ type: 'tool_result', tool_use_id: 'tu_1', content: 'output' }]),
      asst({ id: 'msg_2', usage: usage(), content: [{ type: 'text', text: 'done' }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.turnCount).toBe(1);
  });

  test('U7: user row with real text and system-reminder mixed increments turnCount', () => {
    const lines = [
      user('first prompt'),
      asst({ id: 'msg_1', usage: usage(), content: [{ type: 'text', text: 'ok' }] }),
      user([
        { type: 'text', text: '<system-reminder>ignore me</system-reminder>' },
        { type: 'text', text: 'please do X' },
      ]),
      asst({ id: 'msg_2', usage: usage(), content: [{ type: 'text', text: 'done' }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.turnCount).toBe(2);
  });

  test('U8: dedup survives compact_boundary — same (message.id, requestId) before and after is counted once', () => {
    const requestId = 'req_SAME';
    const lines = [
      user('prompt'),
      asst({ id: 'msg_SAME', requestId, usage: usage({ input: 100, output: 200 }), content: [{ type: 'text', text: 'before' }] }),
      sys('compact_boundary', { trigger: 'auto', pre_tokens: 1234 }),
      asst({ id: 'msg_SAME', requestId, usage: usage({ input: 100, output: 200 }), content: [{ type: 'tool_use', id: 'tu_a', name: 'Bash', input: { command: 'ls' } }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(100);
    expect(result.tokens.output).toBe(200);
    expect(result.toolUses.length).toBe(1);
    expect(result.compactBoundaries.length).toBe(1);
  });

  test('U9: duplicate tool_use block.id across different message.ids pushes once', () => {
    const lines = [
      user('prompt'),
      asst({ id: 'msg_X', requestId: 'req_X', usage: usage({ input: 1, output: 1 }), content: [{ type: 'tool_use', id: 'tu_dup', name: 'Bash', input: { command: 'ls' } }] }),
      asst({ id: 'msg_Y', requestId: 'req_Y', usage: usage({ input: 1, output: 1 }), content: [{ type: 'tool_use', id: 'tu_dup', name: 'Bash', input: { command: 'ls' } }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(2);
    expect(result.toolUses.length).toBe(1);
    expect(result.toolUses[0].id).toBe('tu_dup');
  });
});

describe('parseTranscript - ccusage alignment (spec 006)', () => {
  test('U10: same message.id with different requestIds → counted as separate entries', () => {
    // ccusage uses `${message.id}:${requestId}` as the dedup hash. Same
    // message.id replayed under a new requestId is a legitimate distinct
    // accounting unit (e.g. retried API call) and must accumulate.
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_RETRY',
        requestId: 'req_001',
        usage: usage({ input: 50, output: 25 }),
        content: [{ type: 'text', text: 'first attempt' }],
      }),
      asst({
        id: 'msg_RETRY',
        requestId: 'req_002',
        usage: usage({ input: 50, output: 25 }),
        content: [{ type: 'text', text: 'retry attempt' }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    // Both rows count: 2x usage.
    expect(result.tokens.input).toBe(100);
    expect(result.tokens.output).toBe(50);
  });

  test('U10b: same message.id + same requestId still deduped (within one entry)', () => {
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_DUP',
        requestId: 'req_X',
        usage: usage({ input: 10, output: 20 }),
        content: [{ type: 'text', text: 'block 1' }],
      }),
      asst({
        id: 'msg_DUP',
        requestId: 'req_X',
        usage: usage({ input: 10, output: 20 }),
        content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.tokens.input).toBe(10);
    expect(result.tokens.output).toBe(20);
  });

  test('U10c: requestId missing on one row → falls back to legacy "always count"', () => {
    // Mixed presence: one row has requestId, the other does not. Hash returns
    // null when either id is missing → both rows count.
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_PARTIAL',
        requestId: 'req_a',
        usage: usage({ input: 5, output: 5 }),
        content: [{ type: 'text', text: 'a' }],
      }),
      asst({
        id: 'msg_PARTIAL',
        // requestId omitted
        usage: usage({ input: 5, output: 5 }),
        content: [{ type: 'text', text: 'b' }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    // Second row has no hash → not deduped → both count.
    expect(result.tokens.input).toBe(10);
    expect(result.tokens.output).toBe(10);
  });

  test('synthetic: <synthetic> model rows are skipped (no usage, no tool_use)', () => {
    const lines = [
      user('prompt'),
      asst({
        id: 'msg_real',
        requestId: 'req_real',
        model: 'claude-sonnet-4-7',
        usage: usage({ input: 100, output: 50, cacheCreation: 0, cacheRead: 0 }),
        content: [{ type: 'text', text: 'real response' }],
      }),
      asst({
        id: 'msg_synth',
        requestId: 'req_synth',
        model: '<synthetic>',
        usage: usage({ input: 9999, output: 9999, cacheCreation: 9999, cacheRead: 9999 }),
        content: [{ type: 'tool_use', id: 'tu_synth', name: 'Bash', input: { command: 'rm -rf /' } }],
      }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    // Only the real assistant row is counted.
    expect(result.tokens.input).toBe(100);
    expect(result.tokens.output).toBe(50);
    expect(result.tokens.cacheCreation).toBe(0);
    expect(result.tokens.cacheRead).toBe(0);
    // Synthetic tool_use must not be pushed.
    expect(result.toolUses.length).toBe(0);
    // Result-level model must NOT be overwritten by '<synthetic>'.
    expect(result.model).toBe('claude-sonnet-4-7');
  });

  test('synthetic: turnCount is unaffected by synthetic rows (user-row based)', () => {
    const lines = [
      user('first'),
      asst({ id: 'msg_1', requestId: 'r1', usage: usage(), content: [{ type: 'text', text: 'a' }] }),
      asst({ id: 'msg_synth', requestId: 'r_synth', model: '<synthetic>', usage: usage({ input: 1000 }), content: [] }),
      user('second'),
      asst({ id: 'msg_2', requestId: 'r2', usage: usage(), content: [{ type: 'text', text: 'b' }] }),
    ];
    const result = parseTranscript(writeTranscript(lines));
    expect(result.turnCount).toBe(2);
  });
});

describe('parseTranscript - real fixture', () => {
  const fixtureCandidates = [
    path.join(__dirname, 'fixtures', 'sample.jsonl'),
    path.join(os.homedir(), '.claude/projects/-Users-t-hirai-develop-claude-activity-tracker/5f61e000-58b4-40ee-8b22-7bdf59ca1ae7.jsonl'),
  ];
  const fixture = fixtureCandidates.find((p) => fs.existsSync(p));

  const maybeTest = fixture ? test : test.skip;

  maybeTest('deduped totals for 5f61e000 fixture match ~1/1.89 of naive totals', () => {
    const lines = fs.readFileSync(fixture, 'utf8').split('\n').filter(Boolean);
    let naiveIn = 0, naiveOut = 0, naiveCR = 0, naiveRd = 0;
    const seen = new Set();
    let assistantRows = 0;
    for (const line of lines) {
      let o; try { o = JSON.parse(line); } catch { continue; }
      if (o.type !== 'assistant') continue;
      assistantRows++;
      if (o.message?.id) seen.add(o.message.id);
      const u = o.message?.usage;
      if (!u) continue;
      naiveIn += u.input_tokens || 0;
      naiveOut += u.output_tokens || 0;
      naiveCR += u.cache_creation_input_tokens || 0;
      naiveRd += u.cache_read_input_tokens || 0;
    }
    expect(assistantRows).toBe(37);
    expect(seen.size).toBe(19);

    const result = parseTranscript(fixture);
    const parsedTotal = result.tokens.input + result.tokens.output + result.tokens.cacheCreation + result.tokens.cacheRead;
    const naiveTotal = naiveIn + naiveOut + naiveCR + naiveRd;
    const ratio = naiveTotal / parsedTotal;

    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.1);
  });
});
