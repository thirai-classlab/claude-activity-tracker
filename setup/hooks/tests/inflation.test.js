/**
 * CI regression guard for the message.id dedup fix.
 *
 * Spec: docs/specs/001-transcript-dedup.md
 * Bug refs: #1, #10, #13, #14
 *
 * This test loads every real transcript fixture shipped in
 * `tests/fixtures/*.jsonl`, computes:
 *
 *   - naive   = sum(usage) without dedup    ("broken" behavior)
 *   - parsed  = sum(usage) via parseTranscript (dedup applied)
 *   - rowRatio   = assistantRows / uniqueMessageIds
 *   - tokenRatio = naive / parsed
 *
 * The fix is considered healthy iff, on fixtures that exhibited the bug
 * (rowRatio >= 1.5), the parsed totals are at most (1 / 1.5) of the naive
 * totals — i.e. tokenRatio >= 1.5. Any fixture that regresses below those
 * thresholds will break this test, alerting us to parser drift.
 *
 * Fixtures are intentionally kept out of git (they contain real prompt
 * content); the test skips gracefully when none are present so that CI
 * without fixtures still runs the synthetic U1-U9 suite.
 */
const fs = require('fs');
const path = require('path');

const { parseTranscript } = require('../shared/utils');

const MIN_ROW_RATIO = 1.5;
const MIN_TOKEN_RATIO = 1.5;

/** Locate all .jsonl files under tests/fixtures/. */
function findFixtures() {
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dir, f))
    .sort();
}

/** Compute naive (pre-dedup) totals for comparison with parseTranscript. */
function computeNaiveTotals(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  let input = 0;
  let output = 0;
  let cacheCreation = 0;
  let cacheRead = 0;
  let assistantRows = 0;
  const uniqueMessageIds = new Set();

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
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

describe('parseTranscript - inflation guard (real fixtures)', () => {
  test('at least 3 real fixtures are available (skipped in fixture-less CI)', () => {
    if (fixtures.length === 0) {
      // Fixtures are gitignored; CI may not have them. Don't fail hard — the
      // synthetic U1-U9 suite in parseTranscript.test.js still covers dedup.
      console.warn('[inflation.test] No fixtures found under tests/fixtures/. Skipping real-fixture assertions.');
      return;
    }
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });

  // Emit one sub-test per fixture so failures point at the offending file.
  for (const fixture of fixtures) {
    const name = path.basename(fixture);

    test(`fixture ${name}: rowRatio >= ${MIN_ROW_RATIO} AND parsedTotal <= naiveTotal / ${MIN_TOKEN_RATIO}`, () => {
      const naive = computeNaiveTotals(fixture);

      // Only validate fixtures that actually exhibit the dedup bug. Others
      // exist to guard against regressions of the "clean transcript" path.
      if (naive.uniqueCount === 0 || naive.assistantRows === 0) {
        console.warn(`[inflation.test] ${name}: no assistant rows; skipping.`);
        return;
      }
      const rowRatio = naive.assistantRows / naive.uniqueCount;

      // Every shipped fixture must come from a buggy transcript so that the
      // ratio check actually exercises the dedup path. If a clean transcript
      // sneaks in, we want to know — regenerate it from a multi-block session.
      expect(rowRatio).toBeGreaterThanOrEqual(MIN_ROW_RATIO);

      const parsed = parseTranscript(fixture);
      const parsedTotal =
        parsed.tokens.input +
        parsed.tokens.output +
        parsed.tokens.cacheCreation +
        parsed.tokens.cacheRead;

      expect(parsedTotal).toBeGreaterThan(0);

      const tokenRatio = naive.total / parsedTotal;
      // If the parser stops deduping, tokenRatio collapses to ~1.0 and the
      // assertion below fires — which is exactly the regression we want to
      // detect on CI.
      expect(tokenRatio).toBeGreaterThanOrEqual(MIN_TOKEN_RATIO);
      // Upper bound guards against accidentally over-aggressive dedup.
      expect(tokenRatio).toBeLessThan(5);
    });
  }
});
