/**
 * Cost Calculator
 *
 * Thin wrapper over `pricingRepository.getPricing` that converts raw token
 * usage into a USD dollar amount. The repository is now the single source of
 * truth for pricing and already handles the full fallback chain
 * (manual_override -> exact model_id -> family standard -> hardcoded default).
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t4.md
 *
 * Before P2-T4 this file owned a hardcoded `DEFAULT_RATES` table, a
 * `getModelFamily` helper, and a synchronous `calculateCost`. All of that
 * lived in three places (costCalculator, dashboardService, constants) and
 * was unable to express the 1M-context premium tier. Pricing is now
 * centralized in `pricingRepository` and `calculateCost` becomes async.
 */
import { getPricing, type PricingRates } from './pricingRepository';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

/**
 * Backwards-compatible type alias. Older call sites referenced `CostRates`;
 * the repository's `PricingRates` has the same shape so we simply re-export.
 */
export type CostRates = PricingRates;

/**
 * Calculate estimated cost in USD for a given model and token usage.
 *
 * Returns a `Promise<number>` rounded to 4 decimal places. Callers must
 * `await` the result. The pricing lookup is delegated to the repository,
 * which applies the standard fallback chain.
 *
 * The full `usage` object is forwarded to {@link getPricing} so that prompts
 * with combined input tokens above 200K are billed at the registered
 * `-context-1m` premium-tier rates when such a variant exists. See
 * docs/decisions/resolved.md D-008.
 */
export async function calculateCost(
  modelName: string,
  usage: TokenUsage,
): Promise<number> {
  const rates = await getPricing(modelName, {
    inputTokens: usage.inputTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    cacheReadTokens: usage.cacheReadTokens,
    outputTokens: usage.outputTokens,
  });

  const cost =
    (usage.inputTokens / 1_000_000) * rates.inputPerMtok +
    (usage.outputTokens / 1_000_000) * rates.outputPerMtok +
    (usage.cacheCreationTokens / 1_000_000) * rates.cacheWritePerMtok +
    (usage.cacheReadTokens / 1_000_000) * rates.cacheReadPerMtok;

  // Round to 4 decimal places
  return Math.round(cost * 10000) / 10000;
}

/**
 * Backwards-compatible export. `getCostRates` used to be a synchronous
 * helper in this module; it is now simply re-exported from the repository
 * (and is async). Any remaining call sites must `await` the return value.
 */
export { getPricing as getCostRates };
