/**
 * Unit tests for `computeCacheEfficiency` in
 * `server/src/services/dashboardService.ts`.
 *
 * Spec / context:
 *   docs/specs/004-phase1-remaining-bugs.md (bug #12)
 *   docs/tasks/phase-1.5-t1.md
 *
 *   Before the fix, `getStats` computed
 *     cacheEfficiency = totalCacheReadTokens / totalInputTokens
 *   which routinely exceeded 1.0 because `totalInputTokens` excludes the
 *   cache-read portion. The new definition is the cache hit ratio:
 *     cache_hit_ratio = cache_read / (input + cache_creation + cache_read)
 *   which is mathematically bounded to [0, 1] for non-negative inputs.
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx (no extra devDependency). The
 * function under test is a pure helper, so no DB / Prisma mock is required.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { computeCacheEfficiency } from '../src/services/dashboardService';

// ---------------------------------------------------------------------------
// C1: cache_read=0 -> ratio=0
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: cache_read=0 -> ratio=0', () => {
  // Arrange: only fresh input + cache creation, no cache reuse yet.
  const input = 1_000;
  const cacheCreation = 500;
  const cacheRead = 0;

  // Act
  const ratio = computeCacheEfficiency(input, cacheCreation, cacheRead);

  // Assert
  assert.equal(ratio, 0);
});

// ---------------------------------------------------------------------------
// C2: cache_read=100, input=100, cache_creation=0 -> ratio = 100/200 = 0.5
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: half of input-side tokens served from cache -> 0.5', () => {
  // Arrange
  const input = 100;
  const cacheCreation = 0;
  const cacheRead = 100;

  // Act
  const ratio = computeCacheEfficiency(input, cacheCreation, cacheRead);

  // Assert
  assert.equal(ratio, 0.5);
});

// ---------------------------------------------------------------------------
// C3: cache_read=300, input=100, cache_creation=100 -> ratio = 300/500 = 0.6
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: 60% hit ratio when cache_read dominates the denominator', () => {
  // Arrange
  const input = 100;
  const cacheCreation = 100;
  const cacheRead = 300;

  // Act
  const ratio = computeCacheEfficiency(input, cacheCreation, cacheRead);

  // Assert
  assert.equal(ratio, 0.6);
});

// ---------------------------------------------------------------------------
// C4: all-zero -> ratio = 0 (no divide-by-zero NaN)
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: all-zero inputs -> 0 (no NaN)', () => {
  // Arrange / Act
  const ratio = computeCacheEfficiency(0, 0, 0);

  // Assert
  assert.equal(ratio, 0);
  assert.ok(Number.isFinite(ratio), 'ratio must be a finite number');
  assert.ok(!Number.isNaN(ratio), 'ratio must not be NaN');
});

// ---------------------------------------------------------------------------
// C5: 0 <= ratio <= 1 across a sweep of representative inputs (property style)
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: ratio is always within [0, 1] (property sweep)', () => {
  // Arrange: sample matrix covering small, large, lopsided, and equal mixes.
  const samples: Array<[number, number, number]> = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
    [10, 0, 0],
    [0, 10, 0],
    [0, 0, 10],
    [1_000_000, 0, 1],
    [1, 0, 1_000_000],
    [123_456, 7_890, 100_000],
    [50, 50, 50],
    [10_000, 1, 5_000],
    [1, 1, 1_000_000_000],
    // Realistic-looking session aggregate (totalInput >> creation, cache_read
    // can easily exceed input alone — this used to push the legacy formula
    // above 1.0).
    [42_000, 18_000, 350_000],
  ];

  // Act / Assert
  for (const [input, creation, read] of samples) {
    const ratio = computeCacheEfficiency(input, creation, read);

    assert.ok(
      ratio >= 0 && ratio <= 1,
      `ratio out of range for inputs=${input}, creation=${creation}, read=${read}: got ${ratio}`,
    );
    assert.ok(Number.isFinite(ratio), `ratio must be finite, got ${ratio}`);
  }
});

// ---------------------------------------------------------------------------
// Regression: the legacy bug case (cache_read >> input) must NOT exceed 1.0
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: cache_read greater than input still stays <= 1', () => {
  // Arrange: classic pattern from production — 10x cache_read vs fresh input.
  const input = 1_000;
  const cacheCreation = 0;
  const cacheRead = 10_000;

  // Act
  const ratio = computeCacheEfficiency(input, cacheCreation, cacheRead);

  // Assert — old formula: 10000/1000 = 10.0 (1000% efficiency, nonsense).
  // New formula: 10000 / (1000 + 0 + 10000) = ~0.909.
  assert.ok(ratio <= 1, `expected ratio <= 1, got ${ratio}`);
  assert.ok(ratio > 0.9, `expected high cache hit ratio, got ${ratio}`);
});

// ---------------------------------------------------------------------------
// Defensive: negative inputs (corrupted aggregates) are clamped to 0
// ---------------------------------------------------------------------------

test('computeCacheEfficiency: negative inputs are clamped, ratio stays in [0, 1]', () => {
  // Arrange: a malformed aggregation row should never produce a ratio outside
  // [0, 1]. We clamp at the helper boundary.
  const ratio = computeCacheEfficiency(-100, -50, 200);

  // Assert: clamped to (0, 0, 200) -> 200 / 200 = 1
  assert.equal(ratio, 1);
});
