/**
 * Unit tests for `computeSessionGrandTotals` in
 * `server/src/services/dashboardService.ts`.
 *
 * Spec / context:
 *   docs/specs/004-phase1-remaining-bugs.md (bug #4)
 *   docs/tasks/phase-1.5-t5.md
 *
 *   After P1.5-T4, `Session.total_*` columns hold MAIN AGENT values only,
 *   and `Session.subagent_*` columns hold the subagent slice. Every
 *   dashboard endpoint computes grand total = main + subagent at the
 *   read site via `computeSessionGrandTotals`. These tests pin down the
 *   pure aggregation contract:
 *     - grand totals = main + subagent
 *     - main / subagent are exposed as separate fields
 *     - estimatedCost is summed across the two sources
 *     - null / undefined inputs are treated as 0 (Prisma's `_sum` returns
 *       null when no rows match the where clause)
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx (no extra devDependency). The
 * function under test is pure, so no DB / Prisma mock is required.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { computeSessionGrandTotals } from '../src/services/dashboardService';

// ---------------------------------------------------------------------------
// D1: subagent present → grand total = main + subagent
// ---------------------------------------------------------------------------

test('D1: subagent present → grand totals = main + subagent', () => {
  // Arrange
  const sums = {
    totalInputTokens: 500,
    totalOutputTokens: 250,
    totalCacheCreationTokens: 100,
    totalCacheReadTokens: 200,
    estimatedCost: 0.20,
    subagentInputTokens: 1_000,
    subagentOutputTokens: 700,
    subagentCacheCreationTokens: 300,
    subagentCacheReadTokens: 400,
    subagentEstimatedCost: 0.50,
  };

  // Act
  const grand = computeSessionGrandTotals(sums);

  // Assert — grand totals are the sum of both slices
  assert.equal(grand.totalInputTokens, 1_500, 'grand input = main 500 + sub 1000');
  assert.equal(grand.totalOutputTokens, 950, 'grand output = main 250 + sub 700');
  assert.equal(grand.totalCacheCreationTokens, 400);
  assert.equal(grand.totalCacheReadTokens, 600);
  assert.equal(grand.totalCost, 0.70, 'grand cost = 0.20 + 0.50');

  // Assert — main / subagent slices preserved verbatim
  assert.equal(grand.mainInputTokens, 500);
  assert.equal(grand.mainOutputTokens, 250);
  assert.equal(grand.mainCacheCreationTokens, 100);
  assert.equal(grand.mainCacheReadTokens, 200);
  assert.equal(grand.mainCost, 0.20);

  assert.equal(grand.subagentInputTokens, 1_000);
  assert.equal(grand.subagentOutputTokens, 700);
  assert.equal(grand.subagentCacheCreationTokens, 300);
  assert.equal(grand.subagentCacheReadTokens, 400);
  assert.equal(grand.subagentCost, 0.50);
});

// ---------------------------------------------------------------------------
// D2: no subagent → grand totals == main, subagent slice is 0
// ---------------------------------------------------------------------------

test('D2: subagent slice is null/0 → grand totals equal main, subagent = 0', () => {
  // Arrange — Prisma returns null sums when no subagent rows exist for the filter
  const sums = {
    totalInputTokens: 500,
    totalOutputTokens: 300,
    totalCacheCreationTokens: 100,
    totalCacheReadTokens: 200,
    estimatedCost: 0.30,
    subagentInputTokens: null,
    subagentOutputTokens: null,
    subagentCacheCreationTokens: null,
    subagentCacheReadTokens: null,
    subagentEstimatedCost: null,
  };

  // Act
  const grand = computeSessionGrandTotals(sums);

  // Assert — grand totals fall back to main values
  assert.equal(grand.totalInputTokens, 500);
  assert.equal(grand.totalOutputTokens, 300);
  assert.equal(grand.totalCacheCreationTokens, 100);
  assert.equal(grand.totalCacheReadTokens, 200);
  assert.equal(grand.totalCost, 0.30);

  // Assert — subagent slice is 0, not NaN, not null
  assert.equal(grand.subagentInputTokens, 0);
  assert.equal(grand.subagentOutputTokens, 0);
  assert.equal(grand.subagentCacheCreationTokens, 0);
  assert.equal(grand.subagentCacheReadTokens, 0);
  assert.equal(grand.subagentCost, 0);
  assert.ok(Number.isFinite(grand.subagentInputTokens));
});

// ---------------------------------------------------------------------------
// D3: estimatedCost is summed across main + subagent
// ---------------------------------------------------------------------------

test('D3: estimatedCost grand total = main cost + subagent cost', () => {
  // Arrange — focus the assertion on cost columns only
  const sums = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    estimatedCost: 1.25,
    subagentInputTokens: 0,
    subagentOutputTokens: 0,
    subagentCacheCreationTokens: 0,
    subagentCacheReadTokens: 0,
    subagentEstimatedCost: 0.75,
  };

  // Act
  const grand = computeSessionGrandTotals(sums);

  // Assert
  assert.equal(grand.totalCost, 2.00, 'grand cost = 1.25 + 0.75');
  assert.equal(grand.mainCost, 1.25);
  assert.equal(grand.subagentCost, 0.75);
});

// ---------------------------------------------------------------------------
// D4: empty `_sum` (all-null aggregate) → all zeros, no NaN propagation
// ---------------------------------------------------------------------------

test('D4: all-null aggregate → all fields are 0 and finite', () => {
  // Arrange — Prisma's `_sum` payload when the where clause matches no rows
  const sums = {
    totalInputTokens: null,
    totalOutputTokens: null,
    totalCacheCreationTokens: null,
    totalCacheReadTokens: null,
    estimatedCost: null,
    subagentInputTokens: null,
    subagentOutputTokens: null,
    subagentCacheCreationTokens: null,
    subagentCacheReadTokens: null,
    subagentEstimatedCost: null,
  };

  // Act
  const grand = computeSessionGrandTotals(sums);

  // Assert — every field is 0, never null, never NaN
  for (const [key, value] of Object.entries(grand)) {
    assert.equal(value, 0, `${key} should be 0 for all-null input`);
    assert.ok(Number.isFinite(value), `${key} should be finite`);
  }
});

// ---------------------------------------------------------------------------
// D5: undefined fields (legacy callers) are treated identically to null
// ---------------------------------------------------------------------------

test('D5: undefined fields default to 0 (legacy null-safety)', () => {
  // Arrange — empty object simulates an extremely defensive caller
  const sums = {};

  // Act
  const grand = computeSessionGrandTotals(sums);

  // Assert — function must not throw and all fields default to 0
  assert.equal(grand.totalInputTokens, 0);
  assert.equal(grand.totalCost, 0);
  assert.equal(grand.mainInputTokens, 0);
  assert.equal(grand.subagentInputTokens, 0);
});

// ---------------------------------------------------------------------------
// D6: idempotency — same input always yields the same result (referential
// transparency, useful when the helper is called from multiple endpoints)
// ---------------------------------------------------------------------------

test('D6: repeated calls with the same input produce identical output', () => {
  // Arrange
  const sums = {
    totalInputTokens: 123,
    totalOutputTokens: 45,
    totalCacheCreationTokens: 67,
    totalCacheReadTokens: 89,
    estimatedCost: 0.123,
    subagentInputTokens: 321,
    subagentOutputTokens: 54,
    subagentCacheCreationTokens: 76,
    subagentCacheReadTokens: 98,
    subagentEstimatedCost: 0.456,
  };

  // Act
  const first = computeSessionGrandTotals(sums);
  const second = computeSessionGrandTotals(sums);

  // Assert — pure function: outputs are deeply equal across calls
  assert.deepEqual(second, first);
});
