/**
 * Unit tests for `pricingRepository.ts`.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t2.md
 *
 * These tests use an in-memory mock Prisma client injected via
 * `__setPrismaClientForTesting`. No real database is required.
 *
 * Coverage:
 *   P1: exact match (deprecated=false)             -> DB value
 *   P2: no exact match, family standard exists     -> family fallback
 *   P3: unknown family                              -> hardcode sonnet
 *   P4: only deprecated match                       -> falls through to fallback
 *   P5: manual_override record                      -> override wins
 *   P6: `-context-1m` model ID                      -> premium pricing returned
 *   T7:  usage <= 200K + standard model              -> standard tier returned
 *   T8:  usage  > 200K + base model w/ 1m variant    -> still standard tier
 *                                                       (usage no longer triggers 1M auto-promote)
 *   T9:  usage  > 200K + already 1m model            -> premium tier via exact match
 *   T10: usage > 200K + base model, NO 1m variant    -> standard tier
 *   T11: usage absent                                -> standard tier (unchanged)
 *   T12: model id has `[1m]` literal + variant in DB -> premium tier
 *   T13: model id has `[1m]` literal, NO variant     -> standard fallback on base id
 *
 * Run:
 *   cd server && npm test
 */

import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  getPricing,
  getAllModels,
  upsertPricing,
  markDeprecated,
  setVerified,
  __setPrismaClientForTesting,
} from '../src/services/pricingRepository';

// ---------------------------------------------------------------------------
// Fixture rows
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
  makeRow({
    modelId: 'claude-sonnet-4-5-20250929',
    family: 'sonnet',
    tier: 'standard',
    inputPerMtok: 3,
    outputPerMtok: 15,
    cacheWritePerMtok: 3.75,
    cacheReadPerMtok: 0.3,
  }),
  makeRow({
    modelId: 'claude-haiku-4-5-20251001',
    family: 'haiku',
    tier: 'standard',
    inputPerMtok: 0.8,
    outputPerMtok: 4,
    cacheWritePerMtok: 1.0,
    cacheReadPerMtok: 0.08,
  }),
];

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if ((row as unknown as Record<string, unknown>)[key] !== value) {
      return false;
    }
  }
  return true;
}

function buildMockPrisma(initialRows: Row[]): {
  client: {
    modelPricing: {
      findFirst: (args: { where: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }) => Promise<Row | null>;
      findMany: (args?: { where?: Record<string, unknown>; orderBy?: unknown }) => Promise<Row[]>;
      upsert: (args: { where: { modelId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<Row>;
      update: (args: { where: { modelId: string }; data: Record<string, unknown> }) => Promise<Row>;
    };
  };
  rows: Row[];
} {
  const rows: Row[] = initialRows.map((r) => ({ ...r }));

  return {
    rows,
    client: {
      modelPricing: {
        async findFirst(args) {
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

        async findMany(args) {
          const where = args?.where ?? {};
          return rows.filter((r) => matchesWhere(r, where));
        },

        async upsert(args) {
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

        async update(args) {
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
// P1: exact match
// ---------------------------------------------------------------------------

test('P1: exact modelId match returns DB values', async () => {
  const rates = await getPricing('claude-opus-4-7');
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
  assert.equal(rates.cacheWritePerMtok, 18.75);
  assert.equal(rates.cacheReadPerMtok, 1.5);
});

// ---------------------------------------------------------------------------
// P2: family fallback
// ---------------------------------------------------------------------------

test('P2: missing modelId falls back to family standard tier (opus)', async () => {
  const rates = await getPricing('claude-opus-9-99-nonexistent');
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
});

// ---------------------------------------------------------------------------
// P3: unknown family -> hardcode sonnet
// ---------------------------------------------------------------------------

test('P3: unknown family returns hardcoded sonnet defaults', async () => {
  mock.rows.length = 0;
  mock.rows.push(
    makeRow({
      modelId: 'claude-opus-4-7',
      family: 'opus',
      tier: 'standard',
      inputPerMtok: 15,
      outputPerMtok: 75,
      cacheWritePerMtok: 18.75,
      cacheReadPerMtok: 1.5,
    }),
  );
  const rates = await getPricing('gpt-4-unknown-family');
  assert.equal(rates.inputPerMtok, 3);
  assert.equal(rates.outputPerMtok, 15);
  assert.equal(rates.cacheWritePerMtok, 3.75);
  assert.equal(rates.cacheReadPerMtok, 0.3);
});

// ---------------------------------------------------------------------------
// P4: only deprecated record -> falls through
// ---------------------------------------------------------------------------

test('P4: only a deprecated match falls through to fallback', async () => {
  mock.rows.length = 0;
  mock.rows.push(
    makeRow({
      modelId: 'claude-opus-legacy',
      family: 'opus',
      tier: 'standard',
      inputPerMtok: 999,
      outputPerMtok: 999,
      cacheWritePerMtok: 999,
      cacheReadPerMtok: 999,
      deprecated: true,
    }),
  );

  const rates = await getPricing('claude-opus-legacy');
  // Falls back to hardcoded opus family defaults.
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
});

// ---------------------------------------------------------------------------
// P5: manual_override wins
// ---------------------------------------------------------------------------

test('P5: manual_override record takes precedence over standard record', async () => {
  mock.rows.push(
    makeRow({
      modelId: 'claude-opus-4-7',
      family: 'opus',
      tier: 'standard',
      inputPerMtok: 1.11,
      outputPerMtok: 2.22,
      cacheWritePerMtok: 3.33,
      cacheReadPerMtok: 0.44,
      source: 'manual_override',
    }),
  );

  const rates = await getPricing('claude-opus-4-7');
  assert.equal(rates.inputPerMtok, 1.11);
  assert.equal(rates.outputPerMtok, 2.22);
  assert.equal(rates.cacheWritePerMtok, 3.33);
  assert.equal(rates.cacheReadPerMtok, 0.44);
});

// ---------------------------------------------------------------------------
// P6: 1M premium tier
// ---------------------------------------------------------------------------

test('P6: -context-1m model ID returns premium (2x input, 1.5x output) rates', async () => {
  const rates = await getPricing('claude-opus-4-7-context-1m');
  assert.equal(rates.inputPerMtok, 30);
  assert.equal(rates.outputPerMtok, 112.5);
  assert.equal(rates.cacheWritePerMtok, 37.5);
  assert.equal(rates.cacheReadPerMtok, 3.0);
});

// ---------------------------------------------------------------------------
// Additional smoke tests
// ---------------------------------------------------------------------------

test('getAllModels returns all non-deprecated rows by default', async () => {
  const models = await getAllModels();
  assert.equal(models.length, SEED_ROWS.length);
  for (const m of models) {
    assert.equal(m.deprecated, false);
    assert.equal(typeof m.inputPerMtok, 'number');
  }
});

test('getAllModels({ includeDeprecated: true }) returns deprecated rows too', async () => {
  mock.rows.push(
    makeRow({
      modelId: 'claude-old',
      family: 'opus',
      tier: 'standard',
      deprecated: true,
    }),
  );
  const models = await getAllModels({ includeDeprecated: true });
  assert.equal(models.length, SEED_ROWS.length + 1);
});

test('upsertPricing inserts a new row with defaults', async () => {
  await upsertPricing({
    modelId: 'claude-haiku-5-0-new',
    family: 'haiku',
    tier: 'standard',
    inputPerMtok: 1,
    outputPerMtok: 5,
    cacheWritePerMtok: 1.25,
    cacheReadPerMtok: 0.1,
    source: 'litellm',
  });

  const inserted = mock.rows.find((r) => r.modelId === 'claude-haiku-5-0-new');
  assert.ok(inserted);
  assert.equal(inserted?.inputPerMtok, 1);
  assert.equal(inserted?.source, 'litellm');
});

test('markDeprecated flips the flag', async () => {
  await markDeprecated('claude-opus-4-7');
  const row = mock.rows.find((r) => r.modelId === 'claude-opus-4-7');
  assert.equal(row?.deprecated, true);
});

test('setVerified(true) flips the flag', async () => {
  await setVerified('claude-opus-4-7', true);
  const row = mock.rows.find((r) => r.modelId === 'claude-opus-4-7');
  assert.equal(row?.verified, true);
});

// ---------------------------------------------------------------------------
// T7-T11: long-context (1M tier) auto-detection via usage hint
// ---------------------------------------------------------------------------

test('T7: usage total <= 200K returns standard tier rates', async () => {
  // 100K input + 0 cache = below threshold
  const rates = await getPricing('claude-opus-4-7', {
    inputTokens: 100_000,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 1000,
  });
  // Standard opus tier
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
  assert.equal(rates.cacheWritePerMtok, 18.75);
  assert.equal(rates.cacheReadPerMtok, 1.5);
});

test('T8: usage > 200K alone does NOT promote to 1M tier (usage hint is ignored)', async () => {
  // Even though combined usage is 300K and the registry HAS the premium
  // variant, the bare model id `claude-opus-4-7` must still resolve to the
  // standard tier. Per-call input size is not derivable from session totals,
  // so the resolver no longer auto-promotes.
  const rates = await getPricing('claude-opus-4-7', {
    inputTokens: 50_000,
    cacheCreationTokens: 100_000,
    cacheReadTokens: 150_000,
    outputTokens: 2_000,
  });
  // Standard opus tier (NOT premium)
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
  assert.equal(rates.cacheWritePerMtok, 18.75);
  assert.equal(rates.cacheReadPerMtok, 1.5);
});

test('T9: model id already -context-1m resolves to premium via exact match', async () => {
  const rates = await getPricing('claude-opus-4-7-context-1m', {
    inputTokens: 250_000,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 5_000,
  });
  // Premium tier rates (came from the exact-match step).
  assert.equal(rates.inputPerMtok, 30);
  assert.equal(rates.outputPerMtok, 112.5);
});

test('T10: usage > 200K but NO -context-1m variant in DB falls back to standard tier', async () => {
  // Reset rows to a model without any registered 1M variant.
  mock.rows.length = 0;
  mock.rows.push(
    makeRow({
      modelId: 'claude-sonnet-future',
      family: 'sonnet',
      tier: 'standard',
      inputPerMtok: 3,
      outputPerMtok: 15,
      cacheWritePerMtok: 3.75,
      cacheReadPerMtok: 0.3,
    }),
  );

  const rates = await getPricing('claude-sonnet-future', {
    inputTokens: 250_000,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 1_000,
  });

  // Standard sonnet rates (no premium variant existed, so fallback chain ran).
  assert.equal(rates.inputPerMtok, 3);
  assert.equal(rates.outputPerMtok, 15);
  assert.equal(rates.cacheWritePerMtok, 3.75);
  assert.equal(rates.cacheReadPerMtok, 0.3);
});

test('T11: omitting the usage argument returns standard tier', async () => {
  // No usage hint: standard tier exact match.
  const rates = await getPricing('claude-opus-4-7');
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
});

test('T12: model id with [1m] literal resolves to premium when -context-1m variant exists', async () => {
  // Claude Code reports `claude-opus-4-7[1m]` when invoked in 1M-context mode.
  // The resolver must rewrite this to look up `claude-opus-4-7-context-1m`.
  const rates = await getPricing('claude-opus-4-7[1m]');
  assert.equal(rates.inputPerMtok, 30);
  assert.equal(rates.outputPerMtok, 112.5);
  assert.equal(rates.cacheWritePerMtok, 37.5);
  assert.equal(rates.cacheReadPerMtok, 3.0);
});

test('T13: model id with [1m] literal but NO premium variant falls back to base id standard tier', async () => {
  // Drop the premium variant so the [1m] lookup misses; the resolver must
  // continue with the base id (sans `[1m]`) and return standard rates.
  // Mutate in place — the mock client's closure captures the rows reference.
  const idx = mock.rows.findIndex((r) => r.modelId === 'claude-opus-4-7-context-1m');
  if (idx >= 0) mock.rows.splice(idx, 1);

  const rates = await getPricing('claude-opus-4-7[1m]');
  // Standard opus tier from the base id exact match.
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
  assert.equal(rates.cacheWritePerMtok, 18.75);
  assert.equal(rates.cacheReadPerMtok, 1.5);
});

// ---------------------------------------------------------------------------
// Decimal -> number conversion check
// ---------------------------------------------------------------------------

test('Decimal-like values from Prisma are converted to JS number', async () => {
  mock.rows.length = 0;
  const decimalLike = (n: number) => ({
    toNumber: () => n,
    toString: () => String(n),
  });
  mock.rows.push({
    modelId: 'claude-opus-test',
    family: 'opus',
    tier: 'standard',
    inputPerMtok: decimalLike(15) as unknown as number,
    outputPerMtok: decimalLike(75) as unknown as number,
    cacheWritePerMtok: decimalLike(18.75) as unknown as number,
    cacheReadPerMtok: decimalLike(1.5) as unknown as number,
    contextWindow: 200000,
    maxOutput: 8192,
    source: 'litellm',
    verified: true,
    deprecated: false,
    fetchedAt: new Date(),
  });

  const rates = await getPricing('claude-opus-test');
  assert.equal(typeof rates.inputPerMtok, 'number');
  assert.equal(rates.inputPerMtok, 15);
  assert.equal(rates.outputPerMtok, 75);
});
