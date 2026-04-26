/**
 * Unit tests for `scripts/sync-pricing.ts`.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t3.md
 *
 * The sync entrypoint is factored as `runSync(deps)`; these tests inject
 * mock implementations of the HTTP fetchers and the repository functions
 * rather than hitting the network or the real database.
 *
 * Run:
 *   cd server && npm test
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  runSync,
  relevantClaudeModels,
  detectFamily,
  supportsOneMillionContext,
  type LiteLlmData,
  type SyncResult,
} from '../scripts/sync-pricing';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function buildFixture(): LiteLlmData {
  return {
    'claude-opus-4-7': {
      litellm_provider: 'anthropic',
      input_cost_per_token: 0.000005, // => 5.00 / Mtok
      output_cost_per_token: 0.000025, // => 25.00 / Mtok
      cache_creation_input_token_cost: 0.00000625, // => 6.25 / Mtok
      cache_read_input_token_cost: 5e-7, // => 0.5 / Mtok
      max_input_tokens: 1_000_000,
      max_output_tokens: 128_000,
    },
    'claude-sonnet-4-6': {
      litellm_provider: 'anthropic',
      input_cost_per_token: 0.000003, // => 3.00 / Mtok
      output_cost_per_token: 0.000015, // => 15.00 / Mtok
      cache_creation_input_token_cost: 0.00000375,
      cache_read_input_token_cost: 3e-7,
      max_input_tokens: 1_000_000,
      max_output_tokens: 64_000,
    },
    'claude-haiku-4-5': {
      litellm_provider: 'anthropic',
      input_cost_per_token: 0.0000008, // => 0.8 / Mtok
      output_cost_per_token: 0.000004, // => 4.00 / Mtok
      cache_creation_input_token_cost: 0.000001,
      cache_read_input_token_cost: 8e-8,
      max_input_tokens: 200_000,
      max_output_tokens: 8192,
    },
    // Non-anthropic, must be ignored.
    'gpt-4-turbo': {
      litellm_provider: 'openai',
      input_cost_per_token: 0.00001,
      output_cost_per_token: 0.00003,
      max_input_tokens: 128_000,
      max_output_tokens: 4096,
    },
    // Metadata-only entry, no prices -> must be ignored.
    'claude-instant-archived': {
      litellm_provider: 'anthropic',
      max_input_tokens: 100_000,
    },
  };
}

interface UpsertCapture {
  modelId: string;
  family?: string;
  tier?: string;
  inputPerMtok?: number;
  outputPerMtok?: number;
  cacheWritePerMtok?: number;
  cacheReadPerMtok?: number;
  contextWindow?: number | null;
  maxOutput?: number | null;
  source?: string;
  verified?: boolean;
}

function makeRepoMocks(existingRows: Array<{ modelId: string; source: string; deprecated: boolean }> = []) {
  const upserts: UpsertCapture[] = [];
  const deprecated: string[] = [];

  return {
    upserts,
    deprecated,
    upsertPricingImpl: async (record: UpsertCapture) => {
      upserts.push(record);
    },
    getAllModelsImpl: async () =>
      existingRows
        .filter((r) => !r.deprecated)
        .map((r) => ({
          modelId: r.modelId,
          family: 'unknown',
          tier: 'standard',
          inputPerMtok: 0,
          outputPerMtok: 0,
          cacheWritePerMtok: 0,
          cacheReadPerMtok: 0,
          contextWindow: null,
          maxOutput: null,
          source: r.source,
          verified: false,
          deprecated: r.deprecated,
        })),
    markDeprecatedImpl: async (modelId: string) => {
      deprecated.push(modelId);
    },
  };
}

function quietLogger() {
  return {
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

// ---------------------------------------------------------------------------
// Helper predicates
// ---------------------------------------------------------------------------

test('relevantClaudeModels filters to Anthropic Claude entries with pricing', () => {
  const keys = relevantClaudeModels(buildFixture());
  assert.deepEqual(keys.sort(), ['claude-haiku-4-5', 'claude-opus-4-7', 'claude-sonnet-4-6']);
});

test('detectFamily classifies model ids', () => {
  assert.equal(detectFamily('claude-opus-4-7'), 'opus');
  assert.equal(detectFamily('claude-sonnet-4-6'), 'sonnet');
  assert.equal(detectFamily('claude-haiku-4-5'), 'haiku');
  assert.equal(detectFamily('gpt-4-turbo'), 'unknown');
});

test('supportsOneMillionContext detects 1M tier entries', () => {
  assert.equal(supportsOneMillionContext({ max_input_tokens: 1_000_000 }), true);
  assert.equal(supportsOneMillionContext({ max_input_tokens: 500_000 }), false);
  assert.equal(supportsOneMillionContext({}), false);
});

// ---------------------------------------------------------------------------
// runSync happy-path: LiteLLM mock yields 3 models, one 1M-tier twin row each
// for opus and sonnet (haiku only has standard).
// ---------------------------------------------------------------------------

test('runSync upserts standard + long_context_1m tiers for 1M-capable models', async () => {
  const fetchLiteLlmImpl = async () => buildFixture();
  const fetchAnthropicModelsImpl = async () => {
    throw new Error('should not be called without API key');
  };
  const repo = makeRepoMocks();

  const result: SyncResult = await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: {} as NodeJS.ProcessEnv, // no API key, no overrides
    logger: quietLogger(),
  });

  // 3 standard rows + 2 long_context_1m rows (opus, sonnet) = 5 upserts
  assert.equal(result.claudeModelCount, 3);
  assert.equal(result.upserted, 5);
  assert.equal(result.overrides, 0);
  assert.equal(result.deprecated, 0);

  const byId = new Map(repo.upserts.map((u) => [u.modelId, u]));

  const opus = byId.get('claude-opus-4-7');
  assert.ok(opus, 'opus standard row present');
  assert.equal(opus?.tier, 'standard');
  assert.equal(opus?.family, 'opus');
  assert.equal(opus?.inputPerMtok, 5);
  assert.equal(opus?.outputPerMtok, 25);
  assert.equal(opus?.cacheWritePerMtok, 6.25);
  assert.equal(opus?.cacheReadPerMtok, 0.5);
  assert.equal(opus?.contextWindow, 1_000_000);
  assert.equal(opus?.source, 'litellm');

  const opus1m = byId.get('claude-opus-4-7-context-1m');
  assert.ok(opus1m, 'opus 1M-premium twin present');
  assert.equal(opus1m?.tier, 'long_context_1m');
  assert.equal(opus1m?.inputPerMtok, 10); // 2x
  assert.equal(opus1m?.outputPerMtok, 37.5); // 1.5x
  assert.equal(opus1m?.source, 'litellm');

  const sonnet = byId.get('claude-sonnet-4-6');
  assert.ok(sonnet);
  assert.equal(sonnet?.inputPerMtok, 3);
  assert.equal(sonnet?.outputPerMtok, 15);

  const haiku = byId.get('claude-haiku-4-5');
  assert.ok(haiku, 'haiku standard row present');
  // Haiku does not have 1M tier in fixture -> no premium twin.
  assert.equal(byId.has('claude-haiku-4-5-context-1m'), false);
});

// ---------------------------------------------------------------------------
// LiteLLM fetch failure -> warning + no upserts except possible env overrides
// ---------------------------------------------------------------------------

test('runSync tolerates LiteLLM fetch failure without erroring', async () => {
  const fetchLiteLlmImpl = async () => {
    throw new Error('boom: network down');
  };
  const fetchAnthropicModelsImpl = async () => [];
  const repo = makeRepoMocks();

  const result = await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: {} as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  assert.equal(result.upserted, 0);
  assert.equal(result.deprecated, 0);
  assert.equal(result.claudeModelCount, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /LiteLLM fetch failed/);
});

// ---------------------------------------------------------------------------
// Environment variable overrides produce manual_override rows even when
// LiteLLM is reachable.
// ---------------------------------------------------------------------------

test('runSync applies COST_* env overrides as manual_override rows', async () => {
  const fetchLiteLlmImpl = async () => buildFixture();
  const fetchAnthropicModelsImpl = async () => [];
  const repo = makeRepoMocks();

  const result = await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: {
      COST_OPUS_INPUT: '17',
      COST_OPUS_OUTPUT: '80',
      COST_HAIKU_INPUT: '1',
      // COST_HAIKU_OUTPUT unset -> derive 1 * 5 = 5
    } as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  assert.equal(result.overrides, 2);

  const override = repo.upserts.find(
    (u) => u.modelId === 'claude-opus-manual-override' && u.source === 'manual_override',
  );
  assert.ok(override, 'opus manual override was upserted');
  assert.equal(override?.inputPerMtok, 17);
  assert.equal(override?.outputPerMtok, 80);
  assert.equal(override?.verified, true);

  const haikuOverride = repo.upserts.find(
    (u) => u.modelId === 'claude-haiku-manual-override' && u.source === 'manual_override',
  );
  assert.ok(haikuOverride, 'haiku manual override was upserted with derived output');
  assert.equal(haikuOverride?.inputPerMtok, 1);
  assert.equal(haikuOverride?.outputPerMtok, 5);

  // Sonnet env var not set, so no sonnet override.
  assert.equal(
    repo.upserts.some((u) => u.modelId === 'claude-sonnet-manual-override'),
    false,
  );
});

// ---------------------------------------------------------------------------
// Deprecation: existing litellm rows that are no longer in the feed get
// marked deprecated. Rows from other sources are never auto-deprecated.
// ---------------------------------------------------------------------------

test('runSync deprecates stale litellm rows but leaves other sources alone', async () => {
  const fetchLiteLlmImpl = async () => buildFixture();
  const fetchAnthropicModelsImpl = async () => [];
  const repo = makeRepoMocks([
    { modelId: 'claude-opus-4-7', source: 'litellm', deprecated: false }, // still in feed
    { modelId: 'claude-old-retired', source: 'litellm', deprecated: false }, // gone
    { modelId: 'claude-opus-manual-override', source: 'manual_override', deprecated: false }, // must stay
    { modelId: 'claude-sonnet-legacy-internal', source: 'fallback_default', deprecated: false }, // must stay
  ]);

  const result = await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: {} as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  assert.equal(result.deprecated, 1);
  assert.deepEqual(repo.deprecated, ['claude-old-retired']);
});

// ---------------------------------------------------------------------------
// Anthropic API Key present: verification call runs but failures are tolerated
// ---------------------------------------------------------------------------

test('runSync invokes Anthropic /v1/models when ANTHROPIC_API_KEY is set', async () => {
  const fetchLiteLlmImpl = async () => buildFixture();
  let anthropicCalled = false;
  const fetchAnthropicModelsImpl = async (key: string) => {
    anthropicCalled = true;
    assert.equal(key, 'sk-ant-test');
    return [{ id: 'claude-opus-4-7' }];
  };
  const repo = makeRepoMocks();

  await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: { ANTHROPIC_API_KEY: 'sk-ant-test' } as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  assert.equal(anthropicCalled, true);
});

test('runSync continues when Anthropic /v1/models 401s', async () => {
  const fetchLiteLlmImpl = async () => buildFixture();
  const fetchAnthropicModelsImpl = async () => {
    throw new Error('Anthropic HTTP 401 Unauthorized');
  };
  const repo = makeRepoMocks();

  const result = await runSync({
    fetchLiteLlmImpl,
    fetchAnthropicModelsImpl,
    upsertPricingImpl: repo.upsertPricingImpl,
    getAllModelsImpl: repo.getAllModelsImpl,
    markDeprecatedImpl: repo.markDeprecatedImpl,
    env: { ANTHROPIC_API_KEY: 'sk-ant-bad' } as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  assert.equal(result.upserted, 5, 'litellm upserts still happen');
  assert.ok(result.warnings.some((w) => /Anthropic/.test(w)));
});
