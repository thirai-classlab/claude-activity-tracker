/**
 * Unit tests for `server/src/services/hookService.ts` — stop hook model
 * overwrite logic (bug #6 / P2-T10).
 *
 * Spec / context:
 * - Before the fix, `handleStop` wrote `session.model` only when
 *   `data.model` was truthy (`data.model ? { model: data.model } : {}`).
 *   When the transcript parser emitted a real model name
 *   (e.g. `claude-opus-4-7`) we want to always overwrite the
 *   session.model snapshot (which may still hold an older value from
 *   session-start like `claude-opus-4-6`).
 * - The one case we still skip is `'unknown'`, which the parser emits
 *   when it cannot determine the model.
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx, so no extra devDependency is
 * required. The DB-dependent side of `handleStop` is not exercised here;
 * instead we test the pure `resolveSessionModelUpdate` helper that encodes
 * the overwrite decision.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { resolveSessionModelUpdate } from '../src/services/hookService';

// ---------------------------------------------------------------------------
// Positive: real model string -> overwrite
// ---------------------------------------------------------------------------

test('resolveSessionModelUpdate: real model name -> overwrite session.model', () => {
  // Arrange
  const dataModel = 'claude-opus-4-7';

  // Act
  const update = resolveSessionModelUpdate(dataModel);

  // Assert
  assert.deepEqual(update, { model: 'claude-opus-4-7' });
});

test('resolveSessionModelUpdate: overwrites even when previous snapshot was a real model', () => {
  // This is the bug #6 scenario: session.model was 'claude-opus-4-6' at
  // session-start, transcript later settled on 'claude-opus-4-7'. The
  // resolver must return an update object so Prisma writes the new value.

  // Arrange
  const dataModel = 'claude-opus-4-7';

  // Act
  const update = resolveSessionModelUpdate(dataModel);

  // Assert - non-empty object means `...update` will spread into Prisma.update
  assert.equal(Object.keys(update).length, 1);
  assert.equal((update as { model: string }).model, 'claude-opus-4-7');
});

test('resolveSessionModelUpdate: other real model names are passed through verbatim', () => {
  for (const name of [
    'claude-sonnet-4-7',
    'claude-haiku-4-5',
    'claude-opus-4-5',
    'claude-sonnet-4-6-20250929',
  ]) {
    assert.deepEqual(
      resolveSessionModelUpdate(name),
      { model: name },
      `should overwrite with ${name}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Negative: 'unknown' -> preserve existing session.model
// ---------------------------------------------------------------------------

test("resolveSessionModelUpdate: 'unknown' -> preserve existing session.model", () => {
  // Arrange
  const dataModel = 'unknown';

  // Act
  const update = resolveSessionModelUpdate(dataModel);

  // Assert - empty object, so `...update` is a no-op in Prisma.update
  assert.deepEqual(update, {});
});

// ---------------------------------------------------------------------------
// Negative: missing / empty -> preserve existing session.model
// ---------------------------------------------------------------------------

test('resolveSessionModelUpdate: undefined -> preserve existing session.model', () => {
  assert.deepEqual(resolveSessionModelUpdate(undefined), {});
});

test('resolveSessionModelUpdate: null -> preserve existing session.model', () => {
  assert.deepEqual(resolveSessionModelUpdate(null), {});
});

test('resolveSessionModelUpdate: empty string -> preserve existing session.model', () => {
  assert.deepEqual(resolveSessionModelUpdate(''), {});
});
