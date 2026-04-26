/**
 * CI regression guard for the server-side message.id dedup fix.
 *
 * Mirrors `setup/hooks/tests/inflation.test.js` so that the hook parser and
 * the server parser stay in lock-step. If either side drifts, the matching
 * test will fail and CI will catch the regression.
 *
 * Spec: docs/specs/001-transcript-dedup.md
 * Bug refs: #1, #10, #13, #14
 *
 * Run:
 *   cd server && npm test
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseTranscriptFile } from '../src/services/transcriptParser';

const MIN_ROW_RATIO = 1.5;
const MIN_TOKEN_RATIO = 1.5;

interface NaiveTotals {
  total: number;
  assistantRows: number;
  uniqueCount: number;
}

function findFixtures(): string[] {
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dir, f))
    .sort();
}

function computeNaiveTotals(transcriptPath: string): NaiveTotals {
  const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(Boolean);
  let input = 0;
  let output = 0;
  let cacheCreation = 0;
  let cacheRead = 0;
  let assistantRows = 0;
  const uniqueMessageIds = new Set<string>();

  for (const line of lines) {
    let obj: Record<string, unknown> & { type?: string; message?: { id?: string; usage?: Record<string, number> } };
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (obj?.type !== 'assistant') continue;
    assistantRows += 1;
    if (obj.message?.id) uniqueMessageIds.add(obj.message.id);
    const u = obj.message?.usage;
    if (!u) continue;
    input += u.input_tokens || 0;
    output += u.output_tokens || 0;
    cacheCreation += u.cache_creation_input_tokens || 0;
    cacheRead += u.cache_read_input_tokens || 0;
  }
  return {
    total: input + output + cacheCreation + cacheRead,
    assistantRows,
    uniqueCount: uniqueMessageIds.size,
  };
}

const fixtures = findFixtures();

// ---------------------------------------------------------------------------
// Fixture count guard. Fixtures are gitignored (contain real prompt text) so
// CI without the fixtures will skip the ratio assertions below but still run
// the synthetic U1-U9 suite in transcriptParser.test.ts.
// ---------------------------------------------------------------------------
test('inflation guard: at least 3 fixtures are available locally', () => {
  if (fixtures.length === 0) {
    console.warn('[inflation.test] No fixtures under server/tests/fixtures/. Skipping.');
    return;
  }
  assert.ok(
    fixtures.length >= 3,
    `expected at least 3 transcript fixtures, got ${fixtures.length}`
  );
});

// One sub-test per fixture → failing fixture is visible in the CI log.
for (const fixture of fixtures) {
  const name = path.basename(fixture);

  test(`inflation guard: ${name} – rowRatio >= ${MIN_ROW_RATIO} & parsedTotal <= naive/${MIN_TOKEN_RATIO}`, () => {
    const naive = computeNaiveTotals(fixture);

    if (naive.uniqueCount === 0 || naive.assistantRows === 0) {
      console.warn(`[inflation.test] ${name}: no assistant rows; skipping.`);
      return;
    }

    const rowRatio = naive.assistantRows / naive.uniqueCount;
    assert.ok(
      rowRatio >= MIN_ROW_RATIO,
      `${name}: rowRatio ${rowRatio.toFixed(3)} < ${MIN_ROW_RATIO} – fixture may not exercise the dedup path`
    );

    const parsed = parseTranscriptFile(fixture);
    const parsedTotal =
      parsed.tokens.input +
      parsed.tokens.output +
      parsed.tokens.cacheCreation +
      parsed.tokens.cacheRead;

    assert.ok(parsedTotal > 0, `${name}: parsed total is zero – parser returned empty result`);

    const tokenRatio = naive.total / parsedTotal;
    assert.ok(
      tokenRatio >= MIN_TOKEN_RATIO,
      `${name}: tokenRatio ${tokenRatio.toFixed(3)} < ${MIN_TOKEN_RATIO} – parser appears to have stopped deduping`
    );
    assert.ok(
      tokenRatio < 5,
      `${name}: tokenRatio ${tokenRatio.toFixed(3)} too high – dedup may be over-aggressive`
    );
  });
}
