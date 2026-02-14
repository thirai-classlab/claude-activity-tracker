export interface CostRates {
  /** Cost per 1M input tokens (USD) */
  input: number;
  /** Cost per 1M output tokens (USD) */
  output: number;
  /** Cost per 1M cache write tokens (USD) */
  cacheWrite: number;
  /** Cost per 1M cache read tokens (USD) */
  cacheRead: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

/** Default cost rates per 1M tokens (USD) */
const DEFAULT_RATES: Record<string, CostRates> = {
  opus: {
    input: 15,
    output: 75,
    cacheWrite: 15 * 1.25, // 1.25x input
    cacheRead: 15 * 0.1,   // 0.1x input
  },
  sonnet: {
    input: 3,
    output: 15,
    cacheWrite: 3 * 1.25,
    cacheRead: 3 * 0.1,
  },
  haiku: {
    input: 0.80,
    output: 4,
    cacheWrite: 0.80 * 1.25,
    cacheRead: 0.80 * 0.1,
  },
};

/**
 * Determine the model family from a model name string.
 * Returns 'opus', 'sonnet', or 'haiku'. Defaults to 'sonnet' if unknown.
 */
export function getModelFamily(modelName: string): string {
  const lower = modelName.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  if (lower.includes('sonnet')) return 'sonnet';
  // Default to sonnet for unknown models
  return 'sonnet';
}

/**
 * Get cost rates for a given model name.
 * Rates can be overridden via environment variables:
 *   COST_OPUS_INPUT, COST_OPUS_OUTPUT, COST_SONNET_INPUT, etc.
 */
export function getCostRates(modelName: string): CostRates {
  const family = getModelFamily(modelName);
  const defaults = DEFAULT_RATES[family] || DEFAULT_RATES.sonnet;

  const envPrefix = `COST_${family.toUpperCase()}`;
  const inputRate = parseFloat(process.env[`${envPrefix}_INPUT`] || '') || defaults.input;
  const outputRate = parseFloat(process.env[`${envPrefix}_OUTPUT`] || '') || defaults.output;

  return {
    input: inputRate,
    output: outputRate,
    cacheWrite: inputRate * 1.25,
    cacheRead: inputRate * 0.1,
  };
}

/**
 * Calculate estimated cost in USD for a given model and token usage.
 * Returns a number rounded to 4 decimal places.
 */
export function calculateCost(modelName: string, usage: TokenUsage): number {
  const rates = getCostRates(modelName);

  const cost =
    (usage.inputTokens / 1_000_000) * rates.input +
    (usage.outputTokens / 1_000_000) * rates.output +
    (usage.cacheCreationTokens / 1_000_000) * rates.cacheWrite +
    (usage.cacheReadTokens / 1_000_000) * rates.cacheRead;

  // Round to 4 decimal places
  return Math.round(cost * 10000) / 10000;
}
