/**
 * Tests for `GET /api/dashboard/models`.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t7.md
 *
 * Uses `__setPrismaClientForTesting` to inject an in-memory mock
 * `modelPricing` table so these tests do not require a live DB.
 * Spins up a lightweight Express app with the real `apiKeyAuth` middleware
 * and the real `dashboardRoutes` router to verify end-to-end behavior.
 */

import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import http from 'node:http';
import express from 'express';

import { dashboardRoutes } from '../src/routes/dashboardRoutes';
import { apiKeyAuth } from '../src/middleware/auth';
import { __setPrismaClientForTesting } from '../src/services/pricingRepository';

// ---------------------------------------------------------------------------
// Fixture rows — two active + one deprecated row
// ---------------------------------------------------------------------------

interface Row {
  modelId: string;
  family: string;
  tier: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
  contextWindow: number | null;
  maxOutput: number | null;
  source: string;
  verified: boolean;
  deprecated: boolean;
}

function buildRows(): Row[] {
  return [
    {
      modelId: 'claude-opus-4-7',
      family: 'opus',
      tier: 'standard',
      inputPerMtok: 15,
      outputPerMtok: 75,
      cacheWritePerMtok: 18.75,
      cacheReadPerMtok: 1.5,
      contextWindow: 200000,
      maxOutput: 8192,
      source: 'litellm',
      verified: false,
      deprecated: false,
    },
    {
      modelId: 'claude-sonnet-4-6',
      family: 'sonnet',
      tier: 'standard',
      inputPerMtok: 3,
      outputPerMtok: 15,
      cacheWritePerMtok: 3.75,
      cacheReadPerMtok: 0.3,
      contextWindow: 200000,
      maxOutput: 8192,
      source: 'litellm',
      verified: true,
      deprecated: false,
    },
    {
      modelId: 'claude-old-retired',
      family: 'sonnet',
      tier: 'standard',
      inputPerMtok: 3,
      outputPerMtok: 15,
      cacheWritePerMtok: 3.75,
      cacheReadPerMtok: 0.3,
      contextWindow: 200000,
      maxOutput: 8192,
      source: 'litellm',
      verified: false,
      deprecated: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

function makeMock(rows: Row[]) {
  return {
    modelPricing: {
      findFirst: async () => null,
      findMany: async (args?: {
        where?: { deprecated?: boolean };
        orderBy?: unknown;
      }) => {
        const where = args?.where;
        if (where && where.deprecated === false) {
          return rows.filter((r) => !r.deprecated);
        }
        return rows;
      },
      upsert: async () => {
        throw new Error('not used');
      },
      update: async () => {
        throw new Error('not used');
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: spin up a real Express app and return base URL
// ---------------------------------------------------------------------------

async function startServer(): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', apiKeyAuth, dashboardRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

let currentRows: Row[] = [];
const TEST_API_KEY = 'test-models-key-123';
const originalApiKey = process.env.API_KEY;

beforeEach(() => {
  currentRows = buildRows();
  __setPrismaClientForTesting(makeMock(currentRows) as unknown as never);
  process.env.API_KEY = TEST_API_KEY;
});

afterEach(() => {
  __setPrismaClientForTesting(null);
  if (originalApiKey === undefined) {
    delete process.env.API_KEY;
  } else {
    process.env.API_KEY = originalApiKey;
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('GET /api/dashboard/models returns active models with valid JSON shape', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models`, {
      headers: { 'X-API-Key': TEST_API_KEY },
    });
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      models: Array<{
        modelId: string;
        family: string;
        tier: string;
        inputPerMtok: number;
        outputPerMtok: number;
        cacheWritePerMtok: number;
        cacheReadPerMtok: number;
        contextWindow: number | null;
        source: string;
        verified: boolean;
        deprecated: boolean;
      }>;
    };

    assert.ok(Array.isArray(body.models));
    assert.equal(body.models.length, 2, 'deprecated row is excluded by default');

    const opus = body.models.find((m) => m.modelId === 'claude-opus-4-7');
    assert.ok(opus);
    assert.equal(opus?.family, 'opus');
    assert.equal(opus?.tier, 'standard');
    assert.equal(opus?.inputPerMtok, 15);
    assert.equal(opus?.outputPerMtok, 75);
    assert.equal(opus?.cacheWritePerMtok, 18.75);
    assert.equal(opus?.cacheReadPerMtok, 1.5);
    assert.equal(opus?.contextWindow, 200000);
    assert.equal(opus?.source, 'litellm');
    assert.equal(opus?.verified, false);
    assert.equal(opus?.deprecated, false);

    assert.equal(
      body.models.some((m) => m.modelId === 'claude-old-retired'),
      false,
      'deprecated row must not appear without includeDeprecated',
    );
  } finally {
    await close();
  }
});

test('GET /api/dashboard/models?includeDeprecated=true includes deprecated rows', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(
      `${baseUrl}/api/dashboard/models?includeDeprecated=true`,
      { headers: { 'X-API-Key': TEST_API_KEY } },
    );
    assert.equal(res.status, 200);

    const body = (await res.json()) as {
      models: Array<{ modelId: string; deprecated: boolean }>;
    };
    assert.equal(body.models.length, 3);
    const retired = body.models.find((m) => m.modelId === 'claude-old-retired');
    assert.ok(retired, 'deprecated row present when includeDeprecated=true');
    assert.equal(retired?.deprecated, true);
  } finally {
    await close();
  }
});

test('GET /api/dashboard/models rejects invalid API key with 401', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models`, {
      headers: { 'X-API-Key': 'wrong-key' },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Unauthorized');
  } finally {
    await close();
  }
});

test('GET /api/dashboard/models rejects missing API key with 401', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models`);
    assert.equal(res.status, 401);
  } finally {
    await close();
  }
});
