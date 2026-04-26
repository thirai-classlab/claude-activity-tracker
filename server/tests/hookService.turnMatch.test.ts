/**
 * Unit tests for `server/src/services/hookService.ts` — `buildTurnIndexMap`
 * helper (bug #2 / P1.5-T3).
 *
 * Spec / context:
 * - Before the fix, `handleStop` mapped transcript turnIndex -> DB turnId
 *   purely by normalized promptText key match. When key match failed
 *   (newline normalization edge cases, prompt rewrites, etc.) the mapping
 *   ended up empty, so per-turn token / duration / response_text writes
 *   were entirely skipped. In production, 26 of 28 sessions had no turn
 *   level data because of this.
 * - After the fix, we keep the key-based match as the preferred path but
 *   add a positional fallback: any leftover transcript turnIndex is paired
 *   with the next unmatched DB turn (oldest-first). DB turns that remain
 *   unmatched after both passes stay unmapped (existing behavior — main
 *   protection against compaction edge cases).
 *
 * See: docs/specs/004-phase1-remaining-bugs.md  → "バグ #2"
 *
 * Run:
 *   cd server && npm test
 *
 * Uses Node's built-in test runner via tsx, so no extra devDependency is
 * required. We exercise the pure `buildTurnIndexMap` helper to avoid
 * needing a live MariaDB.
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';

import { buildTurnIndexMap } from '../src/services/hookService';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface DbTurn {
  id: number;
  turnNumber: number;
  promptText: string | null;
}

interface ResponseText {
  turnIndex: number | null;
  promptText?: string;
}

// ---------------------------------------------------------------------------
// M1: All turns key-match cleanly.
//     Every transcript turnIndex pairs with its corresponding DB turn via
//     normalized promptText. Positional fallback should not kick in.
// ---------------------------------------------------------------------------

test('M1: full key match maps every turnIndex to its corresponding DB turn id', () => {
  // Arrange
  const dbTurns: DbTurn[] = [
    { id: 100, turnNumber: 1, promptText: 'Implement login screen' },
    { id: 101, turnNumber: 2, promptText: 'Add tests for login screen' },
    { id: 102, turnNumber: 3, promptText: 'Fix flaky test' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'Implement login screen' },
    { turnIndex: 1, promptText: 'Add tests for login screen' },
    { turnIndex: 2, promptText: 'Fix flaky test' },
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  assert.equal(result.get(0), 100, 'turnIndex 0 -> DB id 100');
  assert.equal(result.get(1), 101, 'turnIndex 1 -> DB id 101');
  assert.equal(result.get(2), 102, 'turnIndex 2 -> DB id 102');
  assert.equal(result.size, 3, 'all three turnIndexes mapped');
});

// ---------------------------------------------------------------------------
// M2: All key matches fail (e.g. promptText mismatched / rewritten).
//     Positional fallback must still produce a 1-to-1 oldest-first mapping
//     so per-turn data writes don't disappear silently.
// ---------------------------------------------------------------------------

test('M2: when no keys match, positional fallback maps every turnIndex in order', () => {
  // Arrange — DB promptText is completely different from response_texts'
  const dbTurns: DbTurn[] = [
    { id: 200, turnNumber: 1, promptText: 'A' },
    { id: 201, turnNumber: 2, promptText: 'B' },
    { id: 202, turnNumber: 3, promptText: 'C' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'X' },
    { turnIndex: 1, promptText: 'Y' },
    { turnIndex: 2, promptText: 'Z' },
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  assert.equal(result.get(0), 200, 'positional fallback maps turnIndex 0 -> oldest DB turn');
  assert.equal(result.get(1), 201, 'positional fallback maps turnIndex 1 -> 2nd DB turn');
  assert.equal(result.get(2), 202, 'positional fallback maps turnIndex 2 -> 3rd DB turn');
  assert.equal(result.size, 3, 'all turnIndexes mapped via fallback');
});

// ---------------------------------------------------------------------------
// M3: Mixed — middle turn key-matches, others fall back positionally.
//     The key-matched DB turn must NOT be reused for fallback; remaining
//     transcript turnIndexes must use the still-unmatched DB turns in order.
// ---------------------------------------------------------------------------

test('M3: partial key match consumes that DB turn; remaining keys use positional fallback', () => {
  // Arrange — only middle DB turn has a matching promptText
  const dbTurns: DbTurn[] = [
    { id: 300, turnNumber: 1, promptText: 'first prompt' },
    { id: 301, turnNumber: 2, promptText: 'matching prompt' },
    { id: 302, turnNumber: 3, promptText: 'third prompt' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'mismatched A' },
    { turnIndex: 1, promptText: 'matching prompt' },
    { turnIndex: 2, promptText: 'mismatched C' },
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  // turnIndex 1 must key-match DB id 301 directly (not positional)
  assert.equal(result.get(1), 301, 'turnIndex 1 key-matches DB id 301');

  // The remaining transcript indexes (0 and 2) fall back positionally onto
  // the still-unmatched DB turns in turnNumber order: 300 then 302.
  // The current iteration order processes responseTexts in order [0,1,2]:
  //   - turnIndex 0: no key match → consumes oldest unmatched (300)
  //   - turnIndex 1: key match → consumes 301
  //   - turnIndex 2: no key match → consumes next unmatched (302)
  assert.equal(result.get(0), 300, 'turnIndex 0 falls back to DB id 300');
  assert.equal(result.get(2), 302, 'turnIndex 2 falls back to DB id 302');
  assert.equal(result.size, 3, 'all three turnIndexes mapped');

  // Sanity: every mapped DB id must be unique (no double-binding)
  const ids = [...result.values()];
  assert.equal(new Set(ids).size, ids.length, 'no DB turn id is mapped more than once');
});

// ---------------------------------------------------------------------------
// M4: response_texts longer than dbTurns (compaction scenario).
//     Excess transcript turnIndexes have no DB row to bind to and must be
//     silently ignored instead of crashing or wrapping around.
// ---------------------------------------------------------------------------

test('M4: when response_texts > dbTurns, excess transcript turnIndexes are ignored', () => {
  // Arrange — 2 DB turns, 4 response_texts (post-compaction shape)
  const dbTurns: DbTurn[] = [
    { id: 400, turnNumber: 1, promptText: 'p1' },
    { id: 401, turnNumber: 2, promptText: 'p2' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'p1' },
    { turnIndex: 1, promptText: 'p2' },
    { turnIndex: 2, promptText: 'no DB row' },
    { turnIndex: 3, promptText: 'no DB row either' },
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  assert.equal(result.get(0), 400, 'turnIndex 0 maps to DB id 400');
  assert.equal(result.get(1), 401, 'turnIndex 1 maps to DB id 401');
  assert.equal(result.has(2), false, 'turnIndex 2 has no mapping (DB pool exhausted)');
  assert.equal(result.has(3), false, 'turnIndex 3 has no mapping (DB pool exhausted)');
  assert.equal(result.size, 2, 'only the 2 mappable turns are recorded');
});

// ---------------------------------------------------------------------------
// M5: dbTurns longer than response_texts.
//     Existing behavior: leftover DB turns simply remain unmapped (we don't
//     fabricate response_text turnIndexes).
// ---------------------------------------------------------------------------

test('M5: when dbTurns > response_texts, extra DB turns stay unmapped (existing behavior)', () => {
  // Arrange — 3 DB turns, 1 response_text
  const dbTurns: DbTurn[] = [
    { id: 500, turnNumber: 1, promptText: 'a' },
    { id: 501, turnNumber: 2, promptText: 'b' },
    { id: 502, turnNumber: 3, promptText: 'c' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'a' },
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  assert.equal(result.get(0), 500, 'turnIndex 0 maps to first DB turn via key match');
  assert.equal(result.size, 1, 'only one mapping; DB ids 501 and 502 remain unmapped');
});

// ---------------------------------------------------------------------------
// M6: rt.promptText is missing (undefined / empty).
//     Must NOT skip the entry the way the old code did — fallback should
//     still bind the turnIndex to the next unmatched DB turn so per-turn
//     data is preserved.
// ---------------------------------------------------------------------------

test('M6: missing rt.promptText falls through to positional fallback (no skip)', () => {
  // Arrange
  const dbTurns: DbTurn[] = [
    { id: 600, turnNumber: 1, promptText: 'real prompt 1' },
    { id: 601, turnNumber: 2, promptText: 'real prompt 2' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: 0 },                          // no promptText at all
    { turnIndex: 1, promptText: '' },          // empty string promptText
  ];

  // Act
  const result = buildTurnIndexMap(dbTurns, responseTexts);

  // Assert
  assert.equal(result.get(0), 600, 'missing promptText → fallback to oldest DB turn');
  assert.equal(result.get(1), 601, 'empty promptText → fallback to next DB turn');
  assert.equal(result.size, 2, 'both turnIndexes mapped via fallback');
});

// ---------------------------------------------------------------------------
// M7: Edge cases — empty inputs and null turnIndex must be handled cleanly.
// ---------------------------------------------------------------------------

test('M7a: empty response_texts returns empty map', () => {
  const dbTurns: DbTurn[] = [
    { id: 700, turnNumber: 1, promptText: 'a' },
  ];
  const result = buildTurnIndexMap(dbTurns, []);
  assert.equal(result.size, 0, 'empty response_texts → empty map');
});

test('M7b: empty dbTurns returns empty map', () => {
  const responseTexts: ResponseText[] = [
    { turnIndex: 0, promptText: 'a' },
  ];
  const result = buildTurnIndexMap([], responseTexts);
  assert.equal(result.size, 0, 'empty dbTurns → no mappings possible');
});

test('M7c: response_text with null turnIndex is ignored entirely', () => {
  const dbTurns: DbTurn[] = [
    { id: 710, turnNumber: 1, promptText: 'a' },
  ];
  const responseTexts: ResponseText[] = [
    { turnIndex: null, promptText: 'a' },
  ];
  const result = buildTurnIndexMap(dbTurns, responseTexts);
  assert.equal(result.size, 0, 'null turnIndex must not consume a DB turn');
});
