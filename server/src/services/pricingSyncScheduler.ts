/**
 * Pricing sync scheduler.
 *
 * Wraps `runSync` from `scripts/sync-pricing.ts` with:
 *  - non-blocking initial run on process startup
 *  - periodic setInterval at PRICING_SYNC_INTERVAL_SEC (default 3600s)
 *  - error containment so the HTTP server keeps running on sync failures
 *
 * Spec:  docs/specs/002-model-pricing-registry.md
 * Task:  docs/tasks/phase-2-t9.md
 */

import { runSync as defaultRunSync, type SyncResult } from '../../scripts/sync-pricing';

export const DEFAULT_INTERVAL_SEC = 3600;

type Logger = Pick<Console, 'log' | 'warn' | 'error'>;

export interface PricingSyncHandle {
  stop: () => void;
}

export interface StartPricingSyncOptions {
  runSync?: () => Promise<SyncResult>;
  env?: NodeJS.ProcessEnv;
  logger?: Logger;
  disabled?: boolean;
  setIntervalImpl?: typeof setInterval;
  clearIntervalImpl?: typeof clearInterval;
}

export function resolveIntervalMs(env: NodeJS.ProcessEnv): number {
  const raw = env.PRICING_SYNC_INTERVAL_SEC;
  if (raw === undefined || raw === '') {
    return DEFAULT_INTERVAL_SEC * 1000;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INTERVAL_SEC * 1000;
  }
  return Math.floor(parsed) * 1000;
}

/**
 * Kick off the initial pricing sync (non-blocking) and register the periodic
 * scheduler. Returns a handle whose `stop()` clears the interval.
 *
 * Errors from `runSync` are logged but never propagated — an external data
 * source being down (LiteLLM, Anthropic) must not take the HTTP server with it.
 */
export function startPricingSync(options: StartPricingSyncOptions = {}): PricingSyncHandle {
  const runSync = options.runSync ?? defaultRunSync;
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const setIntervalImpl = options.setIntervalImpl ?? setInterval;
  const clearIntervalImpl = options.clearIntervalImpl ?? clearInterval;

  if (options.disabled === true) {
    logger.log('[pricing-sync] disabled via options; skipping startup and schedule.');
    return { stop: () => {} };
  }

  const intervalMs = resolveIntervalMs(env);

  // Initial run — fire-and-forget.
  logger.log('[pricing-sync] initial run...');
  void runOnce(runSync, logger, 'initial');

  const timer = setIntervalImpl(() => {
    logger.log('[pricing-sync] scheduled run...');
    void runOnce(runSync, logger, 'scheduled');
  }, intervalMs);

  // Do not keep the Node event loop alive just for the scheduler.
  // Guarded because fake timers in tests may not implement `unref`.
  if (timer && typeof (timer as NodeJS.Timeout).unref === 'function') {
    (timer as NodeJS.Timeout).unref();
  }

  logger.log(`[pricing-sync] scheduled every ${Math.round(intervalMs / 1000)}s.`);

  return {
    stop: () => {
      clearIntervalImpl(timer);
    },
  };
}

async function runOnce(
  runSync: () => Promise<SyncResult>,
  logger: Logger,
  label: 'initial' | 'scheduled',
): Promise<void> {
  try {
    const result = await runSync();
    logger.log(
      `[pricing-sync] ${label} run complete: ` +
        `upserted=${result.upserted} deprecated=${result.deprecated} ` +
        `overrides=${result.overrides} warnings=${result.warnings.length}`,
    );
    if (result.warnings.length > 0) {
      for (const warn of result.warnings) {
        logger.warn(`[pricing-sync] WARN ${warn}`);
      }
    }
  } catch (err) {
    logger.error(`[pricing-sync] ${label} run failed:`, err);
  }
}
