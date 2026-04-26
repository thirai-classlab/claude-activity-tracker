/**
 * Unit tests for `server/src/services/hookService.ts` healthcheck filter
 * (P6-T3 / spec 006 / D-012).
 *
 * Hook installer (`aidd install`) and `aidd doctor` send synthetic SessionStart
 * + Stop events with reserved session_uuid prefixes to verify the API endpoint.
 * These rows must never land in the dashboard.
 *
 * Two layers of coverage:
 *
 * 1. Pure: `isHealthcheckSessionUuid` covers all string prefix logic.
 * 2. Behavioral: each public handler must early-return BEFORE touching
 *    `prisma`. We assert this by calling the handler with a healthcheck UUID
 *    inside a process where DATABASE_URL points at an unreachable host. If
 *    the early-return is missing, the handler would attempt to reach Prisma
 *    and throw or hang. With the early-return in place, the handler resolves
 *    without contacting the DB.
 *
 *    To keep the test hermetic and fast, we monkey-patch the imported `prisma`
 *    module so any call into it would throw. The handler must NOT throw,
 *    proving it never reached prisma.
 *
 * Run:
 *   cd server && npm test
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  isHealthcheckSessionUuid,
  handleSessionStart,
  handlePrompt,
  handleSubagentStart,
  handleSubagentStop,
  handleStop,
  handleSessionEnd,
} from '../src/services/hookService';
import prisma from '../src/lib/prisma';

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

test('isHealthcheckSessionUuid: install-healthcheck- prefix is detected', () => {
  assert.equal(isHealthcheckSessionUuid('install-healthcheck-foo'), true);
  assert.equal(isHealthcheckSessionUuid('install-healthcheck-1234567890'), true);
  // Empty suffix is still a prefix match — bouncer is intentional, conservative.
  assert.equal(isHealthcheckSessionUuid('install-healthcheck-'), true);
});

test('isHealthcheckSessionUuid: doctor-healthcheck- prefix is detected', () => {
  assert.equal(isHealthcheckSessionUuid('doctor-healthcheck-abc'), true);
  assert.equal(isHealthcheckSessionUuid('doctor-healthcheck-2026-04-25'), true);
});

test('isHealthcheckSessionUuid: regular session UUIDs pass through', () => {
  assert.equal(
    isHealthcheckSessionUuid('5f61e000-58b4-40ee-8b22-7bdf59ca1ae7'),
    false,
    'real session UUID must not be flagged',
  );
  assert.equal(isHealthcheckSessionUuid('install-something-else'), false);
  assert.equal(isHealthcheckSessionUuid('healthcheck'), false);
});

test('isHealthcheckSessionUuid: empty / null / undefined returns false', () => {
  assert.equal(isHealthcheckSessionUuid(''), false);
  assert.equal(isHealthcheckSessionUuid(null), false);
  assert.equal(isHealthcheckSessionUuid(undefined), false);
});

test('isHealthcheckSessionUuid: prefix must match at start, substring matches reject', () => {
  // "install-healthcheck-" appearing mid-string is NOT a healthcheck.
  assert.equal(isHealthcheckSessionUuid('xinstall-healthcheck-1'), false);
  assert.equal(isHealthcheckSessionUuid('--install-healthcheck-1'), false);
});

// ---------------------------------------------------------------------------
// Behavioral tests: handlers must early-return BEFORE touching prisma
// ---------------------------------------------------------------------------

/**
 * Replace the prisma model methods used by hookService with throwers.
 * If a handler reaches prisma, the test fails with a clear error.
 *
 * We deliberately enumerate the (model, method) pairs used by hookService
 * instead of walking the prisma client tree — Prisma's client object has
 * cycles that would otherwise blow the stack.
 */
function poisonPrisma(): () => void {
  const targets: Array<[string, string]> = [
    ['session', 'upsert'],
    ['session', 'update'],
    ['session', 'findUnique'],
    ['session', 'create'],
    ['session', 'findMany'],
    ['turn', 'create'],
    ['turn', 'count'],
    ['turn', 'findMany'],
    ['turn', 'findFirst'],
    ['turn', 'update'],
    ['toolUse', 'createMany'],
    ['toolUse', 'deleteMany'],
    ['toolUse', 'count'],
    ['toolUse', 'findMany'],
    ['fileChange', 'createMany'],
    ['fileChange', 'deleteMany'],
    ['member', 'upsert'],
    ['subagent', 'create'],
    ['subagent', 'update'],
    ['subagent', 'findUnique'],
    ['subagent', 'count'],
    ['subagent', 'aggregate'],
    ['sessionEvent', 'createMany'],
  ];

  const originals: Array<{ model: string; method: string; value: unknown }> = [];
  const p = prisma as unknown as Record<string, Record<string, unknown>>;

  for (const [model, method] of targets) {
    const modelObj = p[model];
    if (!modelObj) continue;
    if (typeof modelObj[method] !== 'function') continue;
    originals.push({ model, method, value: modelObj[method] });
    modelObj[method] = (() => {
      throw new Error(`prisma.${model}.${method} should not be called for healthcheck sessions`);
    }) as unknown;
  }

  return () => {
    for (const { model, method, value } of originals) {
      (p[model] as Record<string, unknown>)[method] = value;
    }
  };
}

test('handleSessionStart: install-healthcheck-* short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    // Must resolve without throwing — proving prisma was never touched.
    await handleSessionStart({
      session_uuid: 'install-healthcheck-test',
      model: 'claude-sonnet-4-7',
      git_user: 'tester@example.com',
    });
  } finally {
    restore();
  }
});

test('handleSessionStart: doctor-healthcheck-* short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handleSessionStart({
      session_uuid: 'doctor-healthcheck-1761412800',
    });
  } finally {
    restore();
  }
});

test('handlePrompt: healthcheck UUID short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handlePrompt({
      session_uuid: 'install-healthcheck-foo',
      prompt_text: 'hi',
    });
  } finally {
    restore();
  }
});

test('handleSubagentStart: healthcheck UUID short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handleSubagentStart({
      session_uuid: 'doctor-healthcheck-abc',
      agent_uuid: 'agent-1',
      agent_type: 'general-purpose',
    });
  } finally {
    restore();
  }
});

test('handleSubagentStop: healthcheck UUID short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handleSubagentStop({
      session_uuid: 'doctor-healthcheck-abc',
      agent_uuid: 'agent-1',
      agent_type: 'general-purpose',
    });
  } finally {
    restore();
  }
});

test('handleStop: healthcheck UUID short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handleStop({
      session_uuid: 'install-healthcheck-test',
      total_input_tokens: 100,
      total_output_tokens: 50,
    });
  } finally {
    restore();
  }
});

test('handleSessionEnd: healthcheck UUID short-circuits before prisma', async () => {
  const restore = poisonPrisma();
  try {
    await handleSessionEnd({
      session_uuid: 'install-healthcheck-test',
      reason: 'normal',
    });
  } finally {
    restore();
  }
});
