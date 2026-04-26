/**
 * Model Pricing Sync — LiteLLM primary, Anthropic /v1/models verification.
 * Spec: docs/specs/002-model-pricing-registry.md  Task: docs/tasks/phase-2-t3.md
 *
 * Flow:
 *  1. LiteLLM JSON fetch (required).
 *  2. Anthropic /v1/models (optional, verification only).
 *  3. Upsert each Claude model; max_input_tokens >= 1M also upserts
 *     `{modelId}-context-1m` with premium pricing (input 2x, output 1.5x).
 *  4. Mark stale `source='litellm'` rows deprecated=true (soft delete).
 *  5. Apply COST_* env overrides as `source='manual_override'` rows last.
 *
 * Resilience: LiteLLM failure keeps DB intact (warn, exit 0). Anthropic 401
 * is warn-only. HTTP timeout 30s.
 */

import { upsertPricing, getAllModels, markDeprecated } from '../src/services/pricingRepository';

export const LITELLM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
export const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models';

const HTTP_TIMEOUT_MS = 30_000;
const PREMIUM_INPUT_MULTIPLIER = 2;
const PREMIUM_OUTPUT_MULTIPLIER = 1.5;
const TOKENS_PER_MTOK = 1_000_000;

// ---------------------------------------------------------------------------
// External data types
// ---------------------------------------------------------------------------

export interface LiteLlmEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_creation_input_token_cost?: number;
  cache_read_input_token_cost?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  litellm_provider?: string;
  mode?: string;
}
export type LiteLlmData = Record<string, LiteLlmEntry>;

export interface AnthropicModelsListItem {
  id: string;
  display_name?: string;
  type?: string;
}

export interface SyncResult {
  upserted: number;
  deprecated: number;
  overrides: number;
  warnings: string[];
  claudeModelCount: number;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiteLlm(fetchImpl: FetchLike = fetch): Promise<LiteLlmData> {
  const res = await fetchWithTimeout(LITELLM_URL, {}, fetchImpl);
  if (!res.ok) throw new Error(`LiteLLM HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as LiteLlmData;
}

export async function fetchAnthropicModels(
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<AnthropicModelsListItem[]> {
  const res = await fetchWithTimeout(
    ANTHROPIC_MODELS_URL,
    { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } },
    fetchImpl,
  );
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status} ${res.statusText}`);
  const body = (await res.json()) as { data?: AnthropicModelsListItem[] };
  return body.data ?? [];
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

export function detectFamily(modelId: string): 'opus' | 'sonnet' | 'haiku' | 'unknown' {
  const lower = modelId.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  return 'unknown';
}

/** Anthropic Claude entries that carry real $ prices. */
export function relevantClaudeModels(data: LiteLlmData): string[] {
  return Object.keys(data)
    .filter((key) => {
      const entry = data[key];
      if (!entry) return false;
      if (entry.litellm_provider && entry.litellm_provider !== 'anthropic') return false;
      if (!/claude/i.test(key)) return false;
      return (
        typeof entry.input_cost_per_token === 'number' &&
        typeof entry.output_cost_per_token === 'number'
      );
    })
    .sort();
}

function perMtok(perToken: number | undefined | null): number | null {
  if (typeof perToken !== 'number' || !Number.isFinite(perToken)) return null;
  return perToken * TOKENS_PER_MTOK;
}

export function supportsOneMillionContext(entry: LiteLlmEntry): boolean {
  return typeof entry.max_input_tokens === 'number' && entry.max_input_tokens >= 1_000_000;
}

// ---------------------------------------------------------------------------
// Core sync
// ---------------------------------------------------------------------------

interface SyncDeps {
  fetchLiteLlmImpl?: typeof fetchLiteLlm;
  fetchAnthropicModelsImpl?: typeof fetchAnthropicModels;
  upsertPricingImpl?: typeof upsertPricing;
  getAllModelsImpl?: typeof getAllModels;
  markDeprecatedImpl?: typeof markDeprecated;
  env?: NodeJS.ProcessEnv;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export async function runSync(deps: SyncDeps = {}): Promise<SyncResult> {
  const {
    fetchLiteLlmImpl = fetchLiteLlm,
    fetchAnthropicModelsImpl = fetchAnthropicModels,
    upsertPricingImpl = upsertPricing,
    getAllModelsImpl = getAllModels,
    markDeprecatedImpl = markDeprecated,
    env = process.env,
    logger = console,
  } = deps;

  const result: SyncResult = {
    upserted: 0,
    deprecated: 0,
    overrides: 0,
    warnings: [],
    claudeModelCount: 0,
  };

  // 1. LiteLLM — required
  let litellm: LiteLlmData;
  try {
    litellm = await fetchLiteLlmImpl();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.warnings.push(`LiteLLM fetch failed: ${msg}. Existing DB values retained.`);
    logger.warn(`[sync-pricing] LiteLLM fetch failed: ${msg}`);
    result.overrides = await applyEnvOverrides(env, upsertPricingImpl, logger);
    return result;
  }

  // 2. Anthropic /v1/models — optional
  if (env.ANTHROPIC_API_KEY) {
    try {
      const models = await fetchAnthropicModelsImpl(env.ANTHROPIC_API_KEY);
      logger.log(`[sync-pricing] Anthropic /v1/models returned ${models.length} entries`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.warnings.push(`Anthropic /v1/models failed: ${msg}. Continuing with LiteLLM.`);
      logger.warn(`[sync-pricing] Anthropic /v1/models failed: ${msg}`);
    }
  } else {
    logger.log('[sync-pricing] ANTHROPIC_API_KEY not set; skipping /v1/models verification.');
  }

  // 3. Upsert Claude models from LiteLLM (+ premium 1M twin where applicable)
  const modelIds = relevantClaudeModels(litellm);
  result.claudeModelCount = modelIds.length;
  logger.log(`[sync-pricing] Found ${modelIds.length} Claude models in LiteLLM`);

  const seenModelIds = new Set<string>();
  for (const modelId of modelIds) {
    const entry = litellm[modelId];
    if (!entry) continue;

    const inputPerMtok = perMtok(entry.input_cost_per_token);
    const outputPerMtok = perMtok(entry.output_cost_per_token);
    if (inputPerMtok === null || outputPerMtok === null) continue;

    const cacheWritePerMtok =
      perMtok(entry.cache_creation_input_token_cost) ?? inputPerMtok * 1.25;
    const cacheReadPerMtok =
      perMtok(entry.cache_read_input_token_cost) ?? inputPerMtok * 0.1;
    const family = detectFamily(modelId);

    await upsertPricingImpl({
      modelId,
      family,
      tier: 'standard',
      inputPerMtok,
      outputPerMtok,
      cacheWritePerMtok,
      cacheReadPerMtok,
      contextWindow: entry.max_input_tokens ?? null,
      maxOutput: entry.max_output_tokens ?? null,
      source: 'litellm',
    });
    seenModelIds.add(modelId);
    result.upserted += 1;

    if (supportsOneMillionContext(entry)) {
      const premiumId = `${modelId}-context-1m`;
      await upsertPricingImpl({
        modelId: premiumId,
        family,
        tier: 'long_context_1m',
        inputPerMtok: inputPerMtok * PREMIUM_INPUT_MULTIPLIER,
        outputPerMtok: outputPerMtok * PREMIUM_OUTPUT_MULTIPLIER,
        cacheWritePerMtok: cacheWritePerMtok * PREMIUM_INPUT_MULTIPLIER,
        cacheReadPerMtok: cacheReadPerMtok * PREMIUM_INPUT_MULTIPLIER,
        contextWindow: entry.max_input_tokens ?? null,
        maxOutput: entry.max_output_tokens ?? null,
        source: 'litellm',
      });
      seenModelIds.add(premiumId);
      result.upserted += 1;
    }
  }

  // 4. Soft-delete stale litellm rows
  const currentRows = await getAllModelsImpl({ includeDeprecated: false });
  for (const row of currentRows) {
    if (row.source !== 'litellm') continue;
    if (seenModelIds.has(row.modelId)) continue;
    await markDeprecatedImpl(row.modelId);
    result.deprecated += 1;
    logger.log(`[sync-pricing] Deprecated stale model: ${row.modelId}`);
  }

  // 5. COST_* env overrides — run last, win over litellm via repo's fallback chain
  result.overrides = await applyEnvOverrides(env, upsertPricingImpl, logger);

  logger.log(
    `[sync-pricing] Done. upserted=${result.upserted} deprecated=${result.deprecated} overrides=${result.overrides}`,
  );
  return result;
}

// ---------------------------------------------------------------------------
// Env overrides
// ---------------------------------------------------------------------------

interface OverrideSpec {
  modelId: string;
  family: 'opus' | 'sonnet' | 'haiku';
  inputEnv: string;
  outputEnv: string;
}

const OVERRIDE_SPECS: OverrideSpec[] = [
  { modelId: 'claude-opus-manual-override', family: 'opus', inputEnv: 'COST_OPUS_INPUT', outputEnv: 'COST_OPUS_OUTPUT' },
  { modelId: 'claude-sonnet-manual-override', family: 'sonnet', inputEnv: 'COST_SONNET_INPUT', outputEnv: 'COST_SONNET_OUTPUT' },
  { modelId: 'claude-haiku-manual-override', family: 'haiku', inputEnv: 'COST_HAIKU_INPUT', outputEnv: 'COST_HAIKU_OUTPUT' },
];

async function applyEnvOverrides(
  env: NodeJS.ProcessEnv,
  upsertPricingImpl: typeof upsertPricing,
  logger: Pick<Console, 'log' | 'warn' | 'error'>,
): Promise<number> {
  let count = 0;
  for (const spec of OVERRIDE_SPECS) {
    const rawInput = env[spec.inputEnv];
    if (rawInput === undefined || rawInput === '') continue;
    const input = Number(rawInput);
    if (!Number.isFinite(input) || input <= 0) {
      logger.warn(`[sync-pricing] Skipping ${spec.inputEnv}: not a positive number (${rawInput})`);
      continue;
    }
    const rawOutput = env[spec.outputEnv];
    const output = rawOutput !== undefined && rawOutput !== '' ? Number(rawOutput) : input * 5;
    if (!Number.isFinite(output) || output <= 0) {
      logger.warn(`[sync-pricing] Skipping ${spec.outputEnv}: not a positive number (${rawOutput})`);
      continue;
    }

    await upsertPricingImpl({
      modelId: spec.modelId,
      family: spec.family,
      tier: 'standard',
      inputPerMtok: input,
      outputPerMtok: output,
      cacheWritePerMtok: input * 1.25,
      cacheReadPerMtok: input * 0.1,
      source: 'manual_override',
      verified: true,
    });
    logger.log(
      `[sync-pricing] Applied manual override for ${spec.family} (input=$${input}/M, output=$${output}/M)`,
    );
    count += 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// CLI entry (only when invoked directly)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    const result = await runSync();
    if (result.warnings.length > 0) {
      for (const w of result.warnings) console.warn(`[sync-pricing] WARN ${w}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[sync-pricing] Fatal error:', err);
    process.exit(1);
  }
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1] ?? '';
    return entry.endsWith('sync-pricing.ts') || entry.endsWith('sync-pricing.js');
  } catch {
    return false;
  }
})();

if (invokedDirectly) void main();
