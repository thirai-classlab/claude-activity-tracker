/**
 * Pricing Repository
 *
 * Single entry point for reading / writing the `model_pricing` table.
 * Referenced by `costCalculator.ts` and `dashboardService.ts` (future tasks).
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t2.md
 *
 * Design notes:
 *   - Prisma returns `Decimal` for `DECIMAL(10,4)` columns. This repository
 *     converts every `Decimal` to `number` at the boundary so callers never
 *     need to know about `Decimal`.
 *   - Fallback chain for `getPricing`:
 *       1. `source='manual_override'` + exact model_id  (highest priority)
 *       2. Exact model_id  (deprecated=false)
 *       3. Same family, tier='standard'  (deprecated=false)
 *       4. Hardcoded `sonnet` defaults  (last resort)
 *   - `__setPrismaClientForTesting` is exported to allow unit tests to inject
 *     a mock Prisma-like client without touching the real DB.
 */

import defaultPrisma from '../lib/prisma';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PricingRates {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
}

/**
 * Optional usage hint passed to {@link getPricing}.
 *
 * Historically this hint drove a session-level "auto-detect long context" path
 * where any combined input total exceeding 200K would force the
 * `${modelId}-context-1m` premium tier. That heuristic was incorrect because
 * Anthropic's 1M premium pricing is billed **per API call** (single request
 * with `input > 200K`), not per cumulative session usage. Re-reading the same
 * 50K context 5 times across a session would falsely cross the threshold and
 * bill at 2x.
 *
 * The hint is now retained for telemetry/forward-compat but ignored by the
 * resolver. 1M tier selection is driven exclusively by the model id literal
 * (`...-context-1m` or `...[1m]` suffix from Claude Code).
 *
 * Decision: docs/decisions/resolved.md D-008 (revised — see follow-up entry).
 */
export interface UsageHint {
  inputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  outputTokens?: number;
}

export interface ModelPricingRecord extends PricingRates {
  modelId: string;
  family: string;
  tier: string;
  contextWindow: number | null;
  maxOutput: number | null;
  source: string;
  verified: boolean;
  deprecated: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Suffix appended to a model_id to look up its long-context premium tier. */
const LONG_CONTEXT_SUFFIX = '-context-1m';

/**
 * Suffix Claude Code attaches to a model id when it is invoked in 1M-context
 * mode (e.g. `claude-opus-4-7[1m]`). When this literal appears in the model id
 * the resolver prefers the registered `${baseId}-context-1m` premium variant.
 */
const ONE_M_LITERAL_SUFFIX = '[1m]';

/** Hardcoded fallback used when DB has nothing usable. Matches sonnet standard. */
const HARDCODE_FALLBACK: PricingRates = {
  inputPerMtok: 3,
  outputPerMtok: 15,
  cacheWritePerMtok: 3.75,
  cacheReadPerMtok: 0.3,
};

const OPUS_FALLBACK: PricingRates = {
  inputPerMtok: 15,
  outputPerMtok: 75,
  cacheWritePerMtok: 18.75,
  cacheReadPerMtok: 1.5,
};

const HAIKU_FALLBACK: PricingRates = {
  inputPerMtok: 0.8,
  outputPerMtok: 4,
  cacheWritePerMtok: 1.0,
  cacheReadPerMtok: 0.08,
};

const HARDCODE_BY_FAMILY: Record<string, PricingRates> = {
  opus: OPUS_FALLBACK,
  sonnet: HARDCODE_FALLBACK,
  haiku: HAIKU_FALLBACK,
};

// ---------------------------------------------------------------------------
// Prisma client indirection for testability
// ---------------------------------------------------------------------------

/**
 * Minimal interface of the Prisma client we depend on. Defined structurally
 * so tests can inject a small mock without pulling in the full client.
 */
interface PrismaLike {
  modelPricing: {
    findFirst: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
    }) => Promise<RawModelPricingRow | null>;
    findMany: (args?: {
      where?: Record<string, unknown>;
      orderBy?: Array<Record<string, 'asc' | 'desc'>> | Record<string, 'asc' | 'desc'>;
    }) => Promise<RawModelPricingRow[]>;
    upsert: (args: {
      where: { modelId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<RawModelPricingRow>;
    update: (args: {
      where: { modelId: string };
      data: Record<string, unknown>;
    }) => Promise<RawModelPricingRow>;
    deleteMany: (args: {
      where: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
}

/** Shape that Prisma returns for `ModelPricing` rows. Decimal values are objects with `.toNumber()`. */
interface RawModelPricingRow {
  modelId: string;
  family: string;
  tier: string;
  inputPerMtok: DecimalLike | number;
  outputPerMtok: DecimalLike | number;
  cacheWritePerMtok: DecimalLike | number;
  cacheReadPerMtok: DecimalLike | number;
  contextWindow: number | null;
  maxOutput: number | null;
  source: string;
  verified: boolean;
  deprecated: boolean;
}

interface DecimalLike {
  toNumber?: () => number;
  toString: () => string;
}

let prismaClient: PrismaLike = defaultPrisma as unknown as PrismaLike;

/**
 * Test-only: swap in a mock Prisma-like client. Call with `null` to restore.
 * Not intended for production use.
 */
export function __setPrismaClientForTesting(client: PrismaLike | null): void {
  prismaClient = client ?? (defaultPrisma as unknown as PrismaLike);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(value: DecimalLike | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  // Fallback via string conversion (handles bigint / Decimal without toNumber)
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRates(row: RawModelPricingRow): PricingRates {
  return {
    inputPerMtok: toNumber(row.inputPerMtok),
    outputPerMtok: toNumber(row.outputPerMtok),
    cacheWritePerMtok: toNumber(row.cacheWritePerMtok),
    cacheReadPerMtok: toNumber(row.cacheReadPerMtok),
  };
}

function toRecord(row: RawModelPricingRow): ModelPricingRecord {
  return {
    modelId: row.modelId,
    family: row.family,
    tier: row.tier,
    contextWindow: row.contextWindow,
    maxOutput: row.maxOutput,
    source: row.source,
    verified: row.verified,
    deprecated: row.deprecated,
    ...toRates(row),
  };
}

function inferFamily(modelId: string): 'opus' | 'sonnet' | 'haiku' | null {
  const lower = modelId.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve pricing for a model ID, applying the fallback chain.
 *
 * 1M premium tier selection (revised):
 *   The 1M-context premium tier is selected **only** when the model id literal
 *   declares it. This matches Anthropic's actual billing model — the 2x/1.5x
 *   premium applies to per-request input > 200K, and the only signal the
 *   tracker has for that decision is the model id Claude Code reports.
 *
 *   Two literal forms select the 1M tier:
 *     - `<base>-context-1m` (LiteLLM canonical id) → exact-match path below.
 *     - `<base>[1m]` (Claude Code suffix when invoked in 1M mode) → rewritten
 *       to look up `<base>-context-1m`; falls through to standard rates if
 *       the registry has no premium variant for that family.
 *
 *   The previous "usage total > 200K → auto-promote" heuristic was removed
 *   because cumulative session usage does not correspond to per-API-call
 *   input size, and was producing systematic 1.9x over-billing on long
 *   sessions of any model. The `usage` argument is retained for backwards
 *   compatibility but ignored by the resolver. See docs/decisions/resolved.md
 *   D-008 (and the follow-up correction).
 *
 * Fallback chain:
 *   0. `[1m]` literal in id  → look up `${baseId}-context-1m` first.
 *   1. `source='manual_override'` + exact model_id
 *   2. Exact model_id with `deprecated=false`
 *   3. Same family + `tier='standard'` + `deprecated=false`
 *   4. Hardcoded family defaults (opus / sonnet / haiku)
 *   5. Hardcoded sonnet defaults
 */
export async function getPricing(
  modelId: string,
  // Retained for source compatibility; intentionally unused. ESLint's
  // `no-unused-vars` is configured to ignore underscore-prefixed names.
  _usage?: UsageHint,
): Promise<PricingRates> {
  // 0. `[1m]` literal suffix → prefer the registered `-context-1m` variant.
  //    This is the only path that selects the premium tier when the caller
  //    did not pass a `-context-1m` id directly. If the registry has no
  //    matching premium row, fall through to the standard chain using the
  //    base id (without `[1m]`).
  let resolvedId = modelId;
  if (modelId.includes(ONE_M_LITERAL_SUFFIX)) {
    const baseId = modelId.split(ONE_M_LITERAL_SUFFIX).join('');
    const longRow = await prismaClient.modelPricing.findFirst({
      where: { modelId: `${baseId}${LONG_CONTEXT_SUFFIX}`, deprecated: false },
    });
    if (longRow) {
      return toRates(longRow);
    }
    // No premium variant registered — continue with the bare base id.
    resolvedId = baseId;
  }

  // 1. manual_override takes priority even over exact match
  const override = await prismaClient.modelPricing.findFirst({
    where: { modelId: resolvedId, source: 'manual_override' },
  });
  if (override) {
    return toRates(override);
  }

  // 2. exact match (not deprecated)
  const exact = await prismaClient.modelPricing.findFirst({
    where: { modelId: resolvedId, deprecated: false },
  });
  if (exact) {
    return toRates(exact);
  }

  // 3. family fallback to standard tier
  const family = inferFamily(resolvedId);
  if (family) {
    const familyMatch = await prismaClient.modelPricing.findFirst({
      where: { family, tier: 'standard', deprecated: false },
      orderBy: { fetchedAt: 'desc' },
    });
    if (familyMatch) {
      return toRates(familyMatch);
    }
    // 4. hardcoded family default
    if (HARDCODE_BY_FAMILY[family]) {
      return HARDCODE_BY_FAMILY[family];
    }
  }

  // 5. hardcoded sonnet default (last resort)
  return HARDCODE_FALLBACK;
}

/**
 * List all pricing records. By default excludes deprecated rows.
 */
export async function getAllModels(
  options?: { includeDeprecated?: boolean },
): Promise<ModelPricingRecord[]> {
  const where = options?.includeDeprecated ? {} : { deprecated: false };
  const rows = await prismaClient.modelPricing.findMany({
    where,
    orderBy: [{ family: 'asc' }, { tier: 'asc' }, { modelId: 'asc' }],
  });
  return rows.map(toRecord);
}

/**
 * Upsert a pricing row. `fetchedAt` defaults to `now` if not provided.
 */
export async function upsertPricing(
  record: Partial<ModelPricingRecord> & { modelId: string },
): Promise<void> {
  const now = new Date();

  // Defaults for required DB columns when creating a new row.
  const family = record.family ?? inferFamily(record.modelId) ?? 'unknown';
  const tier = record.tier ?? 'standard';
  const source = record.source ?? 'manual_override';

  const createData: Record<string, unknown> = {
    modelId: record.modelId,
    family,
    tier,
    inputPerMtok: record.inputPerMtok ?? HARDCODE_FALLBACK.inputPerMtok,
    outputPerMtok: record.outputPerMtok ?? HARDCODE_FALLBACK.outputPerMtok,
    cacheWritePerMtok: record.cacheWritePerMtok ?? HARDCODE_FALLBACK.cacheWritePerMtok,
    cacheReadPerMtok: record.cacheReadPerMtok ?? HARDCODE_FALLBACK.cacheReadPerMtok,
    contextWindow: record.contextWindow ?? null,
    maxOutput: record.maxOutput ?? null,
    source,
    fetchedAt: now,
    verified: record.verified ?? false,
    deprecated: record.deprecated ?? false,
  };

  const updateData: Record<string, unknown> = {
    fetchedAt: now,
  };
  if (record.family !== undefined) updateData.family = record.family;
  if (record.tier !== undefined) updateData.tier = record.tier;
  if (record.inputPerMtok !== undefined) updateData.inputPerMtok = record.inputPerMtok;
  if (record.outputPerMtok !== undefined) updateData.outputPerMtok = record.outputPerMtok;
  if (record.cacheWritePerMtok !== undefined) updateData.cacheWritePerMtok = record.cacheWritePerMtok;
  if (record.cacheReadPerMtok !== undefined) updateData.cacheReadPerMtok = record.cacheReadPerMtok;
  if (record.contextWindow !== undefined) updateData.contextWindow = record.contextWindow;
  if (record.maxOutput !== undefined) updateData.maxOutput = record.maxOutput;
  if (record.source !== undefined) updateData.source = record.source;
  if (record.verified !== undefined) updateData.verified = record.verified;
  if (record.deprecated !== undefined) updateData.deprecated = record.deprecated;

  await prismaClient.modelPricing.upsert({
    where: { modelId: record.modelId },
    create: createData,
    update: updateData,
  });
}

/**
 * Mark a model as deprecated (soft-delete; record is kept for history).
 */
export async function markDeprecated(modelId: string): Promise<void> {
  await prismaClient.modelPricing.update({
    where: { modelId },
    data: { deprecated: true },
  });
}

/**
 * Set the `verified` flag (typically flipped to true after manual review).
 */
export async function setVerified(modelId: string, verified: boolean): Promise<void> {
  await prismaClient.modelPricing.update({
    where: { modelId },
    data: { verified },
  });
}

/**
 * Delete the `manual_override` row (if any) for a given model ID.
 * Returns the number of rows removed (0 when no override existed).
 *
 * Only rows with `source='manual_override'` are removed — litellm / fallback
 * rows are never touched by this function. After deletion, `getPricing()`
 * will fall back to the synced litellm / family-default values.
 *
 * Spec: docs/specs/002-model-pricing-registry.md (admin UI manual override)
 * Task: docs/tasks/phase-2-t11.md
 */
export async function deleteOverride(modelId: string): Promise<number> {
  const result = await prismaClient.modelPricing.deleteMany({
    where: { modelId, source: 'manual_override' },
  });
  return result.count;
}
