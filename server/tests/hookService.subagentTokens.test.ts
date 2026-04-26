/**
 * Unit tests for `server/src/services/hookService.ts` — `buildSessionTokenUpdate`
 * helper (bug #4 / P1.5-T4).
 *
 * Spec / context:
 * - Before the fix, `handleStop` wrote `session.total_*` and
 *   `session.estimated_cost` as `(main agent value) + (subagent aggregate)`.
 *   The dashboard separately exposed subagent aggregates via
 *   `getSubagentStats`, so any UI that displayed both panels double-counted
 *   the subagent slice.
 * - After the fix, `Session.total_*` / `estimated_cost` hold MAIN agent
 *   values only and dedicated `Session.subagent_*` columns hold the
 *   subagent aggregate. Grand totals are computed at the read site as
 *   `total_* + subagent_*`.
 * - This test covers the pure helper that builds the Prisma update payload;
 *   the DB-side persistence is covered indirectly by `npm run test:api`.
 *
 * See: docs/specs/004-phase1-remaining-bugs.md  → "バグ #4"
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx, so no extra devDependency is
 * required and no live MariaDB is needed.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { buildSessionTokenUpdate } from '../src/services/hookService';

// ---------------------------------------------------------------------------
// C1: No subagents on the session.
//     `total_*` must reflect the main agent values verbatim and
//     `subagent_*` must all be 0 (empty aggregate from Prisma).
// ---------------------------------------------------------------------------

test('C1: no subagents → total_* reflects main agent, subagent_* all 0', () => {
  // Arrange — Prisma's `aggregate({ _sum: ... })` returns null for sums when
  // no rows match the where clause. The helper must coerce these to 0.
  const mainAgent = {
    total_input_tokens: 500,
    total_output_tokens: 300,
    total_cache_creation_tokens: 100,
    total_cache_read_tokens: 200,
  };
  const mainAgentCost = 0.2;
  const emptySubAgg = {
    inputTokens: null,
    outputTokens: null,
    cacheCreationTokens: null,
    cacheReadTokens: null,
    estimatedCost: null,
  };

  // Act
  const update = buildSessionTokenUpdate(mainAgent, mainAgentCost, emptySubAgg);

  // Assert — main agent values verbatim
  assert.equal(update.totalInputTokens, 500);
  assert.equal(update.totalOutputTokens, 300);
  assert.equal(update.totalCacheCreationTokens, 100);
  assert.equal(update.totalCacheReadTokens, 200);
  assert.equal(update.estimatedCost, 0.2);
  // Assert — subagent columns must all be 0 (NOT inherit main values)
  assert.equal(update.subagentInputTokens, 0);
  assert.equal(update.subagentOutputTokens, 0);
  assert.equal(update.subagentCacheCreationTokens, 0);
  assert.equal(update.subagentCacheReadTokens, 0);
  assert.equal(update.subagentEstimatedCost, 0);
});

// ---------------------------------------------------------------------------
// C2: Main agent + subagent both present.
//     Each goes to its own column. The helper must NOT pre-sum them; that
//     is the entire point of bug #4.
// ---------------------------------------------------------------------------

test('C2: main(input=500, cost=$0.2) + subagent(input=1000, cost=$0.5) → no pre-summing', () => {
  // Arrange
  const mainAgent = {
    total_input_tokens: 500,
    total_output_tokens: 250,
    total_cache_creation_tokens: 50,
    total_cache_read_tokens: 75,
  };
  const mainAgentCost = 0.2;
  const subAgg = {
    inputTokens: 1000,
    outputTokens: 700,
    cacheCreationTokens: 200,
    cacheReadTokens: 400,
    estimatedCost: 0.5,
  };

  // Act
  const update = buildSessionTokenUpdate(mainAgent, mainAgentCost, subAgg);

  // Assert — total_* must equal main agent ONLY (no subagent merge)
  assert.equal(update.totalInputTokens, 500, 'total_input_tokens stays at main value, NOT 1500');
  assert.equal(update.totalOutputTokens, 250);
  assert.equal(update.totalCacheCreationTokens, 50);
  assert.equal(update.totalCacheReadTokens, 75);
  assert.equal(update.estimatedCost, 0.2, 'estimated_cost stays at main cost, NOT 0.7');
  // Assert — subagent_* must equal the aggregate ONLY
  assert.equal(update.subagentInputTokens, 1000);
  assert.equal(update.subagentOutputTokens, 700);
  assert.equal(update.subagentCacheCreationTokens, 200);
  assert.equal(update.subagentCacheReadTokens, 400);
  assert.equal(update.subagentEstimatedCost, 0.5);

  // Cross-check: grand total at the read site recovers the previous semantics
  const grandInput = update.totalInputTokens + update.subagentInputTokens;
  const grandCost = update.estimatedCost + update.subagentEstimatedCost;
  assert.equal(grandInput, 1500, 'grand total recoverable as total + subagent');
  assert.equal(grandCost, 0.7, 'grand cost recoverable as total + subagent');
});

// ---------------------------------------------------------------------------
// C3: Idempotency — calling twice with the same inputs yields the same
//     payload. This guarantees that a re-fired stop hook (Prisma re-aggregates
//     subagents from current DB state) cannot inflate the row.
// ---------------------------------------------------------------------------

test('C3: idempotent — repeated calls with identical inputs produce identical payloads', () => {
  // Arrange — same inputs as C2
  const mainAgent = {
    total_input_tokens: 500,
    total_output_tokens: 250,
    total_cache_creation_tokens: 50,
    total_cache_read_tokens: 75,
  };
  const mainAgentCost = 0.2;
  const subAgg = {
    inputTokens: 1000,
    outputTokens: 700,
    cacheCreationTokens: 200,
    cacheReadTokens: 400,
    estimatedCost: 0.5,
  };

  // Act — call twice
  const first = buildSessionTokenUpdate(mainAgent, mainAgentCost, subAgg);
  const second = buildSessionTokenUpdate(mainAgent, mainAgentCost, subAgg);

  // Assert — every column is identical; in particular subagent_* is NOT doubled
  assert.deepEqual(second, first, 'payload must be identical on repeat call');
  assert.equal(second.subagentInputTokens, 1000, 'subagent_input_tokens must NOT be doubled to 2000');
  assert.equal(second.subagentEstimatedCost, 0.5, 'subagent_estimated_cost must NOT be doubled to 1.0');
});

// ---------------------------------------------------------------------------
// C4 (regression): missing fields default to 0.
//     The Hook payload's `total_*` keys are all optional and may be undefined
//     when a stop hook arrives before the parser populated them.
// ---------------------------------------------------------------------------

test('C4: undefined main agent fields default to 0, never NaN', () => {
  // Arrange — main agent payload is empty (e.g. parser failed)
  const mainAgent = {};
  const mainAgentCost = 0;
  const subAgg = {
    inputTokens: 42,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    estimatedCost: 0.001,
  };

  // Act
  const update = buildSessionTokenUpdate(mainAgent, mainAgentCost, subAgg);

  // Assert — all main agent slots are 0, never NaN
  assert.equal(update.totalInputTokens, 0);
  assert.equal(update.totalOutputTokens, 0);
  assert.equal(update.totalCacheCreationTokens, 0);
  assert.equal(update.totalCacheReadTokens, 0);
  assert.equal(update.estimatedCost, 0);
  assert.equal(Number.isNaN(update.totalInputTokens), false);
  // Subagent values still pass through verbatim
  assert.equal(update.subagentInputTokens, 42);
  assert.equal(update.subagentEstimatedCost, 0.001);
});
