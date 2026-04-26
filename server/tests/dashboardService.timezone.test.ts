/**
 * Unit tests for the timezone helpers in
 * `server/src/services/dashboardService.ts`.
 *
 * Spec / context:
 *   docs/draft/009-timezone-aggregation.md (case A)
 *
 *   MariaDB stores DATETIME values in UTC; the dashboard wants to bucket
 *   sessions by JST day, so every aggregation wraps datetime columns in
 *   `CONVERT_TZ(col, '+00:00', :APP_TIMEZONE)` before applying DATE/HOUR/
 *   DAYOFWEEK. These tests verify the SQL fragments emitted by `tzExpr` /
 *   `tzDate` and the env-var wiring for `APP_TIMEZONE`.
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx (no extra devDependency).
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  getAppTimezone,
  tzDate,
  tzExpr,
} from '../src/services/dashboardService';

// ---------------------------------------------------------------------------
// TZ1: APP_TIMEZONE defaults to '+09:00' when env var is unset.
// ---------------------------------------------------------------------------

test('APP_TIMEZONE default is +09:00 (JST) when env unset at module load', () => {
  // The module reads `APP_TIMEZONE` at import time, which has already
  // happened. We only assert the wiring is correct in a CI environment that
  // does not set the variable.
  if (process.env.APP_TIMEZONE && process.env.APP_TIMEZONE.length > 0) {
    // Skip if the runner injected a different value (e.g. `+05:30`).
    assert.equal(getAppTimezone(), process.env.APP_TIMEZONE);
    return;
  }
  assert.equal(getAppTimezone(), '+09:00');
});

// ---------------------------------------------------------------------------
// TZ2: tzExpr wraps a column with CONVERT_TZ.
// ---------------------------------------------------------------------------

test('tzExpr emits CONVERT_TZ(col, "+00:00", APP_TIMEZONE)', () => {
  const sql = tzExpr('s.started_at');
  assert.match(sql, /^CONVERT_TZ\(s\.started_at, '\+00:00', '[+\-:0-9]+'\)$/);
});

// ---------------------------------------------------------------------------
// TZ3: tzDate wraps tzExpr with DATE().
// ---------------------------------------------------------------------------

test('tzDate emits DATE(CONVERT_TZ(col, ...))', () => {
  const sql = tzDate('s.started_at');
  assert.match(
    sql,
    /^DATE\(CONVERT_TZ\(s\.started_at, '\+00:00', '[+\-:0-9]+'\)\)$/,
  );
});

// ---------------------------------------------------------------------------
// TZ4: tzExpr / tzDate accept qualified columns and aliases.
// ---------------------------------------------------------------------------

test('tz helpers accept different table aliases without quoting', () => {
  assert.equal(
    tzExpr('t.prompt_submitted_at'),
    `CONVERT_TZ(t.prompt_submitted_at, '+00:00', '${getAppTimezone()}')`,
  );
  assert.equal(
    tzDate('se.occurred_at'),
    `DATE(CONVERT_TZ(se.occurred_at, '+00:00', '${getAppTimezone()}'))`,
  );
});
