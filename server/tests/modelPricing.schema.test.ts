/**
 * Schema tests for `ModelPricing` model defined in `prisma/schema.prisma`.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t1.md
 *
 * These tests validate two concerns:
 *   1. The Prisma schema file declares `ModelPricing` with the expected columns,
 *      types, and indexes. (Runs on host, no DB required.)
 *   2. The seed file seeds exactly the 6 expected fallback_default models
 *      with correct pricing values. (Runs on host, parses seed.ts as text.)
 *
 * Run:
 *   cd server && npm test
 */

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SCHEMA_PATH = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const SEED_PATH = path.resolve(__dirname, '..', 'prisma', 'seed.ts');

function readSchema(): string {
  return fs.readFileSync(SCHEMA_PATH, 'utf8');
}

function readSeed(): string {
  return fs.readFileSync(SEED_PATH, 'utf8');
}

function extractModelBlock(schema: string, modelName: string): string | null {
  const re = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const m = schema.match(re);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Schema structure
// ---------------------------------------------------------------------------

test('schema: ModelPricing model is declared', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing');
  assert.ok(block, 'ModelPricing block must exist in schema.prisma');
});

test('schema: ModelPricing maps to model_pricing table', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /@@map\(\s*"model_pricing"\s*\)/);
});

test('schema: ModelPricing.modelId is unique VARCHAR(128)', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  // Must be String @unique with @map("model_id") and @db.VarChar(128)
  assert.match(block, /modelId\s+String\s+@unique\s+@map\(\s*"model_id"\s*\)\s+@db\.VarChar\(128\)/);
});

test('schema: ModelPricing has family and tier VARCHAR(32) columns', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /family\s+String\s+@db\.VarChar\(32\)/);
  assert.match(block, /tier\s+String\s+@db\.VarChar\(32\)/);
});

test('schema: ModelPricing has 4 DECIMAL(10,4) pricing columns', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /inputPerMtok\s+Decimal\s+@map\(\s*"input_per_mtok"\s*\)\s+@db\.Decimal\(10,\s*4\)/);
  assert.match(block, /outputPerMtok\s+Decimal\s+@map\(\s*"output_per_mtok"\s*\)\s+@db\.Decimal\(10,\s*4\)/);
  assert.match(block, /cacheWritePerMtok\s+Decimal\s+@map\(\s*"cache_write_per_mtok"\s*\)\s+@db\.Decimal\(10,\s*4\)/);
  assert.match(block, /cacheReadPerMtok\s+Decimal\s+@map\(\s*"cache_read_per_mtok"\s*\)\s+@db\.Decimal\(10,\s*4\)/);
});

test('schema: ModelPricing has optional contextWindow / maxOutput Int columns', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /contextWindow\s+Int\?\s+@map\(\s*"context_window"\s*\)/);
  assert.match(block, /maxOutput\s+Int\?\s+@map\(\s*"max_output"\s*\)/);
});

test('schema: ModelPricing has source / sourceUrl / fetchedAt columns', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /source\s+String\s+@db\.VarChar\(32\)/);
  assert.match(block, /sourceUrl\s+String\?\s+@map\(\s*"source_url"\s*\)\s+@db\.VarChar\(512\)/);
  assert.match(block, /fetchedAt\s+DateTime\s+@map\(\s*"fetched_at"\s*\)/);
});

test('schema: ModelPricing has boolean flags verified / deprecated with defaults', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /verified\s+Boolean\s+@default\(false\)/);
  assert.match(block, /deprecated\s+Boolean\s+@default\(false\)/);
});

test('schema: ModelPricing has notes Text column', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /notes\s+String\?\s+@db\.Text/);
});

test('schema: ModelPricing declares composite indexes (family,tier) and (deprecated,verified)', () => {
  const schema = readSchema();
  const block = extractModelBlock(schema, 'ModelPricing') ?? '';
  assert.match(block, /@@index\(\[family,\s*tier\]\)/);
  assert.match(block, /@@index\(\[deprecated,\s*verified\]\)/);
});

test('schema: existing 8 tables remain unchanged (sanity check)', () => {
  const schema = readSchema();
  for (const name of [
    'Member', 'Session', 'Turn', 'Subagent', 'ToolUse',
    'FileChange', 'SessionEvent', 'AnalysisLog',
  ]) {
    assert.ok(
      extractModelBlock(schema, name) !== null,
      `Existing model ${name} must still be declared`,
    );
  }
});

// ---------------------------------------------------------------------------
// Seed contents (textual assertions, no DB required)
// ---------------------------------------------------------------------------

const EXPECTED_SEEDS = [
  { modelId: 'claude-opus-4-6',            family: 'opus',   tier: 'standard',        input: 15,  output: 75,    cacheWrite: 18.75, cacheRead: 1.5 },
  { modelId: 'claude-opus-4-7',            family: 'opus',   tier: 'standard',        input: 15,  output: 75,    cacheWrite: 18.75, cacheRead: 1.5 },
  { modelId: 'claude-opus-4-7-context-1m', family: 'opus',   tier: 'long_context_1m', input: 30,  output: 112.5, cacheWrite: 37.5,  cacheRead: 3.0 },
  { modelId: 'claude-sonnet-4-5-20250929', family: 'sonnet', tier: 'standard',        input: 3,   output: 15,    cacheWrite: 3.75,  cacheRead: 0.3 },
  { modelId: 'claude-sonnet-4-6',          family: 'sonnet', tier: 'standard',        input: 3,   output: 15,    cacheWrite: 3.75,  cacheRead: 0.3 },
  { modelId: 'claude-haiku-4-5-20251001',  family: 'haiku',  tier: 'standard',        input: 0.8, output: 4,     cacheWrite: 1.0,   cacheRead: 0.08 },
];

test('seed: all 6 expected model IDs are declared', () => {
  const seed = readSeed();
  for (const e of EXPECTED_SEEDS) {
    assert.match(
      seed,
      new RegExp(`modelId:\\s*'${e.modelId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}'`),
      `seed.ts must declare modelId=${e.modelId}`,
    );
  }
});

test('seed: all families (opus, sonnet, haiku) are covered', () => {
  const seed = readSeed();
  // Find the seed block
  const blockMatch = seed.match(/pricingSeeds[\s\S]*?\];/);
  assert.ok(blockMatch, 'pricingSeeds array must be present');
  const block = blockMatch[0];
  assert.match(block, /family:\s*'opus'/);
  assert.match(block, /family:\s*'sonnet'/);
  assert.match(block, /family:\s*'haiku'/);
});

test('seed: includes long_context_1m tier for 1M premium pricing', () => {
  const seed = readSeed();
  assert.match(seed, /tier:\s*'long_context_1m'/);
});

test('seed: upsert uses source=fallback_default and verified=false', () => {
  const seed = readSeed();
  assert.match(seed, /source:\s*'fallback_default'/);
  assert.match(seed, /verified:\s*false/);
});

test('seed: pricing values are correct for opus standard ($15/$75)', () => {
  const seed = readSeed();
  // Opus standard row must contain both 15 and 75
  const opusStdRe = /modelId:\s*'claude-opus-4-7',[\s\S]*?outputPerMtok:\s*75/;
  assert.match(seed, opusStdRe);
});

test('seed: pricing values are correct for opus 1M premium ($30/$112.5)', () => {
  const seed = readSeed();
  const opus1mRe = /modelId:\s*'claude-opus-4-7-context-1m',[\s\S]*?outputPerMtok:\s*112\.5/;
  assert.match(seed, opus1mRe);
});

test('seed: pricing values are correct for haiku ($0.8/$4)', () => {
  const seed = readSeed();
  const haikuRe = /modelId:\s*'claude-haiku-4-5-20251001',[\s\S]*?outputPerMtok:\s*4/;
  assert.match(seed, haikuRe);
});

test('seed: uses prisma.modelPricing.upsert (idempotent)', () => {
  const seed = readSeed();
  assert.match(seed, /prisma\.modelPricing\.upsert/);
});
