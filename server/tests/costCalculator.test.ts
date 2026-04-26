/**
 * Unit tests for `costCalculator.ts` (DB-backed version).
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t4.md
 *
 * These tests inject a mock Prisma client into `pricingRepository` via
 * `__setPrismaClientForTesting`, so no real database is required.
 *
 * Coverage:
 *   C1: standard opus model           -> calculates cost with DB seed values
 *   C2: 1M premium tier model         -> calculates cost with premium rates
 *   C3: unknown family (DB empty)     -> falls back to hardcoded sonnet default
 *   C4: return type is Promise<number>
 *
 * Run:
 *   cd server && npm test
 */
import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';

import { calculateCost } from '../src/services/costCalculator';
import { __setPrismaClientForTesting } from '../src/services/pricingRepository';

// ---------------------------------------------------------------------------
// Fixture rows (mirrors pricingRepository.test.ts)
// ---------------------------------------------------------------------------

interface Row {
  modelId: string;
  family: string;
  tier: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
  contextWindow: number | null;
  maxOutput: number | null;
  source: string;
  verified: boolean;
  deprecated: boolean;
  fetchedAt: Date;
}

function makeRow(partial: Partial<Row> & { modelId: string; family: string; tier: string }): Row {
  return {
    inputPerMtok: 0,
    outputPerMtok: 0,
    cacheWritePerMtok: 0,
    cacheReadPerMtok: 0,
    contextWindow: null,
    maxOutput: null,
    source: 'fallback_default',
    verified: false,
    deprecated: false,
    fetchedAt: new Date('2026-04-25T00:00:00Z'),
    ...partial,
  };
}

const SEED_ROWS: Row[] = [
  makeRow({
    modelId: 'claude-opus-4-7',
    family: 'opus',
    tier: 'standard',
    inputPerMtok: 15,
    outputPerMtok: 75,
    cacheWritePerMtok: 18.75,
    cacheReadPerMtok: 1.5,
  }),
  makeRow({
    modelId: 'claude-opus-4-7-context-1m',
    family: 'opus',
    tier: 'long_context_1m',
    inputPerMtok: 30,
    outputPerMtok: 112.5,
    cacheWritePerMtok: 37.5,
    cacheReadPerMtok: 3.0,
  }),
];

// ---------------------------------------------------------------------------
// Mock Prisma client (structural)
// ---------------------------------------------------------------------------

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if ((row as unknown as Record<string, unknown>)[key] !== value) {
      return false;
    }
  }
  return true;
}

function buildMockPrisma(initialRows: Row[]) {
  const rows: Row[] = initialRows.map((r) => ({ ...r }));

  return {
    rows,
    client: {
      modelPricing: {
        async findFirst(args: { where: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }) {
          let matches = rows.filter((r) => matchesWhere(r, args.where));
          if (args.orderBy) {
            const [[key, dir]] = Object.entries(args.orderBy);
            matches = matches.sort((a, b) => {
              const av = (a as unknown as Record<string, unknown>)[key];
              const bv = (b as unknown as Record<string, unknown>)[key];
              if (av === bv) return 0;
              const cmp = (av as number | string | Date) < (bv as number | string | Date) ? -1 : 1;
              return dir === 'desc' ? -cmp : cmp;
            });
          }
          return matches[0] ?? null;
        },

        async findMany(args?: { where?: Record<string, unknown>; orderBy?: unknown }) {
          const where = args?.where ?? {};
          return rows.filter((r) => matchesWhere(r, where));
        },

        async upsert(args: { where: { modelId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) {
          const idx = rows.findIndex((r) => r.modelId === args.where.modelId);
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...(args.update as Partial<Row>) };
            return rows[idx];
          }
          const created = makeRow({
            modelId: args.where.modelId,
            family: 'unknown',
            tier: 'standard',
            ...(args.create as Partial<Row>),
          });
          rows.push(created);
          return created;
        },

        async update(args: { where: { modelId: string }; data: Record<string, unknown> }) {
          const idx = rows.findIndex((r) => r.modelId === args.where.modelId);
          if (idx < 0) {
            throw new Error(`Mock update: modelId ${args.where.modelId} not found`);
          }
          rows[idx] = { ...rows[idx], ...(args.data as Partial<Row>) };
          return rows[idx];
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

let mock: ReturnType<typeof buildMockPrisma>;

beforeEach(() => {
  mock = buildMockPrisma(SEED_ROWS);
  __setPrismaClientForTesting(mock.client as unknown as Parameters<typeof __setPrismaClientForTesting>[0]);
});

afterEach(() => {
  __setPrismaClientForTesting(null);
});

// ---------------------------------------------------------------------------
// Common fixture: 1M tokens in every bucket. Makes the math easy:
// cost = inputPerMtok + outputPerMtok + cacheWritePerMtok + cacheReadPerMtok
//
// NOTE: Since D-008 (long-context auto-detection), passing 1M+ input-side
// tokens to a model that has a registered `-context-1m` variant now resolves
// to the premium tier automatically. Tests that need standard-tier rates must
// either keep the input-side total below 200K or call a model id that has no
// premium variant.
// ---------------------------------------------------------------------------

const ONE_M_EACH = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheCreationTokens: 1_000_000,
  cacheReadTokens: 1_000_000,
};

/**
 * Sub-threshold variant used for tests that must exercise the standard tier:
 * 100K input, 50K cache_creation, 0 cache_read = 150K total < 200K.
 * Each bucket still ends up < 1M, so the math is straightforward per-test.
 */
const SUB_THRESHOLD_USAGE = {
  inputTokens: 100_000,
  outputTokens: 1_000_000,
  cacheCreationTokens: 50_000,
  cacheReadTokens: 0,
};

// ---------------------------------------------------------------------------
// C1: standard opus model (sub-threshold tokens -> standard tier)
// ---------------------------------------------------------------------------

test('C1: calculateCost(claude-opus-4-7) sums DB rate columns at standard tier', async () => {
  // Arrange (seeded in beforeEach). Use sub-threshold usage so the long-context
  // auto-detection (D-008) does not kick in.

  // Act
  const cost = await calculateCost('claude-opus-4-7', SUB_THRESHOLD_USAGE);

  // Assert:
  //   input:        100_000 / 1_000_000 * 15    = 1.5
  //   output:     1_000_000 / 1_000_000 * 75    = 75
  //   cacheWrite:    50_000 / 1_000_000 * 18.75 = 0.9375
  //   cacheRead:          0                     = 0
  //   total                                    = 77.4375
  assert.equal(cost, 77.4375);
});

// ---------------------------------------------------------------------------
// C2: 1M premium tier model (explicit suffix)
// ---------------------------------------------------------------------------

test('C2: calculateCost(claude-opus-4-7-context-1m) applies premium rates', async () => {
  // Arrange (seeded in beforeEach)

  // Act
  const cost = await calculateCost('claude-opus-4-7-context-1m', ONE_M_EACH);

  // Assert: 30 + 112.5 + 37.5 + 3.0 = 183.0
  assert.equal(cost, 183.0);
});

// ---------------------------------------------------------------------------
// C2b: bare base id with high cumulative usage stays at STANDARD tier.
// The previous "auto-promote on usage > 200K" heuristic was incorrect
// (Anthropic's 1M premium is per-API-call input size, not session totals),
// so high session usage alone must not flip the tier. See
// docs/decisions/resolved.md D-008 (revised).
// ---------------------------------------------------------------------------

test('C2b: calculateCost(base id) stays on standard tier even with 1M+ token usage', async () => {
  const cost = await calculateCost('claude-opus-4-7', ONE_M_EACH);

  // Standard opus rates: 15 + 75 + 18.75 + 1.5 = 110.25 (NOT 183).
  assert.equal(cost, 110.25);
});

// ---------------------------------------------------------------------------
// C2c: model id with `[1m]` literal suffix (Claude Code 1M-mode signal)
// resolves to the registered `-context-1m` premium tier.
// ---------------------------------------------------------------------------

test('C2c: calculateCost(`<base>[1m]`) resolves to premium 1M tier', async () => {
  const cost = await calculateCost('claude-opus-4-7[1m]', ONE_M_EACH);

  // Premium 1M rates: 30 + 112.5 + 37.5 + 3.0 = 183.0
  assert.equal(cost, 183.0);
});

// ---------------------------------------------------------------------------
// C3: unknown family -> hardcoded sonnet fallback in repository
// ---------------------------------------------------------------------------

test('C3: unknown family falls back to hardcoded sonnet defaults', async () => {
  // Arrange — empty the DB so no exact/family match is possible
  mock.rows.length = 0;

  // Act — sub-threshold usage so the long-context branch never finds anything.
  const cost = await calculateCost('gpt-4-unknown-family', SUB_THRESHOLD_USAGE);

  // Assert:
  //   input:        100_000 / 1_000_000 * 3    = 0.3
  //   output:     1_000_000 / 1_000_000 * 15   = 15
  //   cacheWrite:    50_000 / 1_000_000 * 3.75 = 0.1875
  //   cacheRead:          0                    = 0
  //   total                                   = 15.4875
  assert.equal(cost, 15.4875);
});

// ---------------------------------------------------------------------------
// C4: return type
// ---------------------------------------------------------------------------

test('C4: calculateCost returns a Promise<number> (awaited value is a number)', async () => {
  // Act
  const promised = calculateCost('claude-opus-4-7', SUB_THRESHOLD_USAGE);

  // Assert: thenable
  assert.equal(typeof (promised as Promise<number>).then, 'function');

  const resolved = await promised;
  assert.equal(typeof resolved, 'number');
  assert.ok(Number.isFinite(resolved));
});

// ---------------------------------------------------------------------------
// Rounding sanity check: non-round fractional usage should round to 4dp
// ---------------------------------------------------------------------------

test('calculateCost rounds to 4 decimal places', async () => {
  // Arrange: 1 token input only -> 15 / 1_000_000 = 0.000015
  // Rounded to 4dp -> 0.00002 (actually 0 because 0.000015 -> 0.0000 after *10000 round)
  const cost = await calculateCost('claude-opus-4-7', {
    inputTokens: 1,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });

  // 15 / 1_000_000 = 1.5e-5 ; *10000 = 0.15 ; Math.round = 0 ; /10000 = 0
  assert.equal(cost, 0);

  const cost2 = await calculateCost('claude-opus-4-7', {
    inputTokens: 1_234,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });
  // 1234 / 1_000_000 * 15 = 0.01851 ; round to 4dp = 0.0185
  assert.equal(cost2, 0.0185);
});
