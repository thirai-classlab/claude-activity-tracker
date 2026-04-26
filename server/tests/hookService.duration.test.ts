/**
 * Unit tests for `server/src/services/hookService.ts` — `resolveResponseTime`
 * helper (bug #7 / P1.5-T2).
 *
 * Spec / context:
 * - Before the fix, the LATEST turn's `responseCompletedAt` was unconditionally
 *   set to `new Date()` (hook fire time), even when the transcript already
 *   contained a real assistant timestamp. This inflated `durationMs` by any
 *   idle time the user accumulated after the assistant finished.
 * - After the fix, transcript-derived `responseCompletedAt` is preferred for
 *   ALL turns. The hook-fire `now` only acts as a fallback when the latest
 *   turn has no transcript timestamp.
 * - Earlier turns keep their previous behavior: transcript timestamp if
 *   available, otherwise `null` (duration skipped).
 *
 * See: docs/specs/004-phase1-remaining-bugs.md  → "バグ #7"
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx, so no extra devDependency is
 * required.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { resolveResponseTime } from '../src/services/hookService';

// ---------------------------------------------------------------------------
// Fixed clock for deterministic assertions.
// `now` is later than the transcript timestamps below so that "use transcript"
// vs. "use now" produces clearly different Date values.
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-25T12:00:00.000Z');
const TRANSCRIPT_TS = '2026-04-25T11:30:00.000Z'; // 30 min earlier than NOW

// ---------------------------------------------------------------------------
// D1: latest turn + transcript timestamp present
//     → use transcript timestamp (NOT now). This is the bug #7 fix.
// ---------------------------------------------------------------------------

test('D1: latest turn with rt.responseCompletedAt -> uses transcript timestamp (not now)', () => {
  // Arrange
  const isLatestTurn = true;
  const responseCompletedAt = TRANSCRIPT_TS;

  // Act
  const result = resolveResponseTime(responseCompletedAt, isLatestTurn, NOW);

  // Assert
  assert.ok(result instanceof Date, 'should return a Date instance');
  assert.equal(
    result?.toISOString(),
    TRANSCRIPT_TS,
    'latest turn must prefer transcript timestamp over hook-fire `now`',
  );
  assert.notEqual(
    result?.getTime(),
    NOW.getTime(),
    'must NOT fall back to `now` when transcript timestamp exists',
  );
});

// ---------------------------------------------------------------------------
// D2: latest turn + transcript timestamp missing
//     → fall back to `now`.
// ---------------------------------------------------------------------------

test('D2: latest turn without rt.responseCompletedAt -> falls back to now', () => {
  for (const missing of [undefined, null, '']) {
    // Act
    const result = resolveResponseTime(missing as string | null | undefined, true, NOW);

    // Assert
    assert.ok(result instanceof Date, `should return a Date for missing=${String(missing)}`);
    assert.equal(
      result?.getTime(),
      NOW.getTime(),
      `latest turn falls back to now when responseCompletedAt is ${String(missing)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// D3: middle (non-latest) turn + transcript timestamp present
//     → use transcript timestamp (regression check, behavior unchanged).
// ---------------------------------------------------------------------------

test('D3: non-latest turn with rt.responseCompletedAt -> uses transcript timestamp (regression)', () => {
  // Arrange
  const isLatestTurn = false;
  const responseCompletedAt = TRANSCRIPT_TS;

  // Act
  const result = resolveResponseTime(responseCompletedAt, isLatestTurn, NOW);

  // Assert
  assert.ok(result instanceof Date);
  assert.equal(
    result?.toISOString(),
    TRANSCRIPT_TS,
    'non-latest turns continue to use transcript timestamp',
  );
});

// ---------------------------------------------------------------------------
// D4: middle (non-latest) turn + transcript timestamp missing
//     → null (duration computation must be skipped).
// ---------------------------------------------------------------------------

test('D4: non-latest turn without rt.responseCompletedAt -> null', () => {
  for (const missing of [undefined, null, '']) {
    const result = resolveResponseTime(missing as string | null | undefined, false, NOW);
    assert.equal(
      result,
      null,
      `non-latest turn must return null when responseCompletedAt is ${String(missing)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// D5 (bonus): documented duration-shrink scenario from the spec.
// Demonstrates that the helper's chosen timestamp produces a SHORTER duration
// than the previous "always use now for latest" behavior would.
// ---------------------------------------------------------------------------

test('D5: latest turn duration shrinks vs. previous now-based logic', () => {
  // Arrange — prompt submitted 35 min before now, assistant finished 5 min after prompt
  const promptSubmittedAt = new Date('2026-04-25T11:25:00.000Z');
  const assistantFinishedAt = '2026-04-25T11:30:00.000Z'; // 5 min after prompt
  // NOW is 12:00:00 → 35 min after prompt (30 min of idle after assistant)

  // Act
  const result = resolveResponseTime(assistantFinishedAt, true, NOW);
  assert.ok(result instanceof Date);
  const durationMs = result!.getTime() - promptSubmittedAt.getTime();

  // Old behavior would have produced NOW - promptSubmittedAt = 35 min
  const oldDurationMs = NOW.getTime() - promptSubmittedAt.getTime();

  // Assert
  assert.equal(durationMs, 5 * 60 * 1000, 'duration uses transcript timestamp (5 min)');
  assert.equal(oldDurationMs, 35 * 60 * 1000, 'sanity: old behavior would have been 35 min');
  assert.ok(durationMs < oldDurationMs, 'new behavior must be shorter than old behavior');
});
