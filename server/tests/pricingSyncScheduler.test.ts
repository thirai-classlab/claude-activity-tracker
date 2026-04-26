/**
 * Unit tests for `src/services/pricingSyncScheduler.ts`.
 *
 * Spec:  docs/specs/002-model-pricing-registry.md
 * Task:  docs/tasks/phase-2-t9.md
 *
 * Covers:
 *  - Initial run fires immediately on startup.
 *  - setInterval is scheduled at the configured cadence.
 *  - runSync rejections do NOT propagate (server must keep running).
 *  - PRICING_SYNC_INTERVAL_SEC parsing (default 3600, invalid → default).
 *  - disable flag skips scheduling entirely (for tests / one-off runs).
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  startPricingSync,
  resolveIntervalMs,
  DEFAULT_INTERVAL_SEC,
} from '../src/services/pricingSyncScheduler';

function quietLogger() {
  return {
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

// ---------------------------------------------------------------------------
// resolveIntervalMs
// ---------------------------------------------------------------------------

test('resolveIntervalMs returns default 3600s when env unset', () => {
  assert.equal(resolveIntervalMs({} as unknown as NodeJS.ProcessEnv), DEFAULT_INTERVAL_SEC * 1000);
});

test('resolveIntervalMs honours PRICING_SYNC_INTERVAL_SEC', () => {
  assert.equal(
    resolveIntervalMs({ PRICING_SYNC_INTERVAL_SEC: '60' } as unknown as NodeJS.ProcessEnv),
    60_000,
  );
});

test('resolveIntervalMs falls back to default when value is not a positive number', () => {
  assert.equal(
    resolveIntervalMs({ PRICING_SYNC_INTERVAL_SEC: 'abc' } as unknown as NodeJS.ProcessEnv),
    DEFAULT_INTERVAL_SEC * 1000,
  );
  assert.equal(
    resolveIntervalMs({ PRICING_SYNC_INTERVAL_SEC: '0' } as unknown as NodeJS.ProcessEnv),
    DEFAULT_INTERVAL_SEC * 1000,
  );
  assert.equal(
    resolveIntervalMs({ PRICING_SYNC_INTERVAL_SEC: '-10' } as unknown as NodeJS.ProcessEnv),
    DEFAULT_INTERVAL_SEC * 1000,
  );
});

// ---------------------------------------------------------------------------
// startPricingSync
// ---------------------------------------------------------------------------

test('startPricingSync triggers an initial run synchronously (non-blocking)', async () => {
  let runs = 0;
  const handle = startPricingSync({
    runSync: async () => {
      runs += 1;
      return {
        upserted: 0,
        deprecated: 0,
        overrides: 0,
        warnings: [],
        claudeModelCount: 0,
      };
    },
    env: { PRICING_SYNC_INTERVAL_SEC: '3600' } as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
  });

  // Allow the initial microtask to run.
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runs, 1, 'initial run fired once');
  handle.stop();
});

test('startPricingSync swallows runSync errors so the server is not killed', async () => {
  let runs = 0;
  const errors: unknown[] = [];
  const handle = startPricingSync({
    runSync: async () => {
      runs += 1;
      throw new Error('boom');
    },
    env: { PRICING_SYNC_INTERVAL_SEC: '3600' } as unknown as NodeJS.ProcessEnv,
    logger: {
      log: () => {},
      warn: () => {},
      error: (_msg: string, err?: unknown) => {
        errors.push(err);
      },
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  // Wait an extra turn in case the rejection is queued.
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runs, 1, 'initial run still attempted');
  assert.equal(errors.length >= 1, true, 'error logged');
  handle.stop();
});

test('startPricingSync schedules at the configured interval', async () => {
  let runs = 0;
  const timers: Array<{ handler: () => void; ms: number }> = [];

  const fakeSetInterval = ((handler: () => void, ms: number) => {
    timers.push({ handler, ms });
    return { id: timers.length } as unknown as NodeJS.Timeout;
  }) as unknown as typeof setInterval;

  const fakeClearInterval = ((_: NodeJS.Timeout) => {}) as unknown as typeof clearInterval;

  const handle = startPricingSync({
    runSync: async () => {
      runs += 1;
      return {
        upserted: 0,
        deprecated: 0,
        overrides: 0,
        warnings: [],
        claudeModelCount: 0,
      };
    },
    env: { PRICING_SYNC_INTERVAL_SEC: '10' } as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
    setIntervalImpl: fakeSetInterval,
    clearIntervalImpl: fakeClearInterval,
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(timers.length, 1, 'one interval registered');
  assert.equal(timers[0]?.ms, 10_000, 'interval in ms');

  // Fire the interval handler manually twice and let async callbacks resolve.
  timers[0]?.handler();
  await new Promise((resolve) => setImmediate(resolve));
  timers[0]?.handler();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runs, 3, 'initial + 2 scheduled runs');
  handle.stop();
});

test('startPricingSync disabled=true skips run and interval', async () => {
  let runs = 0;
  let intervals = 0;
  const handle = startPricingSync({
    runSync: async () => {
      runs += 1;
      return {
        upserted: 0,
        deprecated: 0,
        overrides: 0,
        warnings: [],
        claudeModelCount: 0,
      };
    },
    env: {} as unknown as NodeJS.ProcessEnv,
    logger: quietLogger(),
    disabled: true,
    setIntervalImpl: ((_h: () => void, _ms: number) => {
      intervals += 1;
      return { id: 0 } as unknown as NodeJS.Timeout;
    }) as unknown as typeof setInterval,
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runs, 0);
  assert.equal(intervals, 0);
  handle.stop();
});
