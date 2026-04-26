/**
 * Tests for manual-override pricing endpoints.
 *
 * Spec: docs/specs/002-model-pricing-registry.md (admin UI manual override)
 * Task: docs/tasks/phase-2-t11.md
 *
 * Endpoints:
 *   - POST   /api/dashboard/models/override
 *   - DELETE /api/dashboard/models/override/:modelId
 *
 * Tests use `__setPrismaClientForTesting` to inject an in-memory mock
 * `modelPricing` table. They spin up the real `dashboardRoutes` router
 * behind the real `apiKeyAuth` middleware so the full request path is
 * exercised end-to-end without a live DB.
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
// In-memory mock Prisma client supporting upsert / deleteMany / findMany / findFirst
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
  fetchedAt: Date;
}

function matchesWhere(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if ((row as unknown as Record<string, unknown>)[key] !== value) {
      return false;
    }
  }
  return true;
}

function makeMock(initialRows: Row[]) {
  const rows: Row[] = initialRows.map((r) => ({ ...r }));

  return {
    rows,
    client: {
      modelPricing: {
        async findFirst(args: { where: Record<string, unknown> }) {
          return rows.find((r) => matchesWhere(r, args.where)) ?? null;
        },
        async findMany(args?: { where?: Record<string, unknown> }) {
          const where = args?.where ?? {};
          return rows.filter((r) => matchesWhere(r, where));
        },
        async upsert(args: {
          where: { modelId: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) {
          const idx = rows.findIndex((r) => r.modelId === args.where.modelId);
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...(args.update as Partial<Row>) };
            return rows[idx];
          }
          const created: Row = {
            modelId: args.where.modelId,
            family: 'unknown',
            tier: 'standard',
            inputPerMtok: 0,
            outputPerMtok: 0,
            cacheWritePerMtok: 0,
            cacheReadPerMtok: 0,
            contextWindow: null,
            maxOutput: null,
            source: 'manual_override',
            verified: false,
            deprecated: false,
            fetchedAt: new Date(),
            ...(args.create as Partial<Row>),
          };
          rows.push(created);
          return created;
        },
        async update(args: { where: { modelId: string }; data: Partial<Row> }) {
          const idx = rows.findIndex((r) => r.modelId === args.where.modelId);
          if (idx < 0) throw new Error('not found');
          rows[idx] = { ...rows[idx], ...args.data };
          return rows[idx];
        },
        async deleteMany(args: { where: Record<string, unknown> }) {
          let count = 0;
          for (let i = rows.length - 1; i >= 0; i--) {
            if (matchesWhere(rows[i], args.where)) {
              rows.splice(i, 1);
              count += 1;
            }
          }
          return { count };
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: boot a real Express app with real middleware + router
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

let mock: ReturnType<typeof makeMock>;
const TEST_API_KEY = 'test-override-key-xyz';
const originalApiKey = process.env.API_KEY;

beforeEach(() => {
  const seed: Row[] = [
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
      fetchedAt: new Date('2026-04-25T00:00:00Z'),
    },
  ];
  mock = makeMock(seed);
  __setPrismaClientForTesting(mock.client as unknown as never);
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
// POST /models/override
// ---------------------------------------------------------------------------

test('POST /models/override upserts a manual override and GET /models reflects it', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const postRes = await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        modelId: 'claude-opus-4-7',
        family: 'opus',
        tier: 'standard',
        inputPerMtok: 10,
        outputPerMtok: 50,
        cacheWritePerMtok: 12.5,
        cacheReadPerMtok: 1,
      }),
    });
    assert.equal(postRes.status, 200);
    const postBody = (await postRes.json()) as { ok: boolean; modelId: string };
    assert.equal(postBody.ok, true);
    assert.equal(postBody.modelId, 'claude-opus-4-7');

    // Confirm the stored row has source='manual_override' and new rates
    const stored = mock.rows.find((r) => r.modelId === 'claude-opus-4-7');
    assert.ok(stored);
    assert.equal(stored?.source, 'manual_override');
    assert.equal(stored?.inputPerMtok, 10);
    assert.equal(stored?.outputPerMtok, 50);

    // GET /models should return the overridden rates
    const getRes = await fetch(`${baseUrl}/api/dashboard/models`, {
      headers: { 'X-API-Key': TEST_API_KEY },
    });
    assert.equal(getRes.status, 200);
    const getBody = (await getRes.json()) as {
      models: Array<{ modelId: string; inputPerMtok: number; source: string }>;
    };
    const opus = getBody.models.find((m) => m.modelId === 'claude-opus-4-7');
    assert.ok(opus);
    assert.equal(opus?.inputPerMtok, 10);
    assert.equal(opus?.source, 'manual_override');
  } finally {
    await close();
  }
});

test('POST /models/override creates a new row when modelId does not exist', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        modelId: 'internal-custom-model',
        family: 'sonnet',
        tier: 'standard',
        inputPerMtok: 2.5,
        outputPerMtok: 10,
        cacheWritePerMtok: 3,
        cacheReadPerMtok: 0.25,
      }),
    });
    assert.equal(res.status, 200);

    const created = mock.rows.find((r) => r.modelId === 'internal-custom-model');
    assert.ok(created, 'new row should be inserted');
    assert.equal(created?.source, 'manual_override');
    assert.equal(created?.inputPerMtok, 2.5);
  } finally {
    await close();
  }
});

test('POST /models/override rejects missing modelId with 400', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        modelId: '',
        inputPerMtok: 1,
        outputPerMtok: 2,
        cacheWritePerMtok: 3,
        cacheReadPerMtok: 0.1,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /modelId/);
  } finally {
    await close();
  }
});

test('POST /models/override rejects negative rates with 400', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        modelId: 'claude-opus-4-7',
        inputPerMtok: -1,
        outputPerMtok: 2,
        cacheWritePerMtok: 3,
        cacheReadPerMtok: 0.1,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /inputPerMtok/);
  } finally {
    await close();
  }
});

test('POST /models/override requires API key (401 without it)', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: 'x',
        inputPerMtok: 1,
        outputPerMtok: 2,
        cacheWritePerMtok: 3,
        cacheReadPerMtok: 0.1,
      }),
    });
    assert.equal(res.status, 401);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// DELETE /models/override/:modelId
// ---------------------------------------------------------------------------

test('DELETE /models/override/:modelId removes the manual_override row', async () => {
  // First upsert an override
  const { baseUrl, close } = await startServer();
  try {
    await fetch(`${baseUrl}/api/dashboard/models/override`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        modelId: 'claude-opus-4-7',
        inputPerMtok: 9.99,
        outputPerMtok: 49.99,
        cacheWritePerMtok: 12,
        cacheReadPerMtok: 1,
      }),
    });
    assert.equal(
      mock.rows.find((r) => r.modelId === 'claude-opus-4-7')?.source,
      'manual_override',
    );

    // Now delete
    const delRes = await fetch(
      `${baseUrl}/api/dashboard/models/override/claude-opus-4-7`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': TEST_API_KEY },
      },
    );
    assert.equal(delRes.status, 200);
    const body = (await delRes.json()) as {
      ok: boolean;
      modelId: string;
      removed: number;
    };
    assert.equal(body.ok, true);
    assert.equal(body.modelId, 'claude-opus-4-7');
    assert.equal(body.removed, 1);

    // Row with source=manual_override should be gone
    assert.equal(
      mock.rows.find((r) => r.modelId === 'claude-opus-4-7'),
      undefined,
    );
  } finally {
    await close();
  }
});

test('DELETE /models/override/:modelId returns removed=0 when nothing to delete', async () => {
  const { baseUrl, close } = await startServer();
  try {
    // The seed has a litellm row for claude-opus-4-7 — not manual_override.
    // Delete should NOT remove it and should return removed=0.
    const delRes = await fetch(
      `${baseUrl}/api/dashboard/models/override/claude-opus-4-7`,
      {
        method: 'DELETE',
        headers: { 'X-API-Key': TEST_API_KEY },
      },
    );
    assert.equal(delRes.status, 200);
    const body = (await delRes.json()) as { removed: number };
    assert.equal(body.removed, 0);

    // litellm row must still exist untouched
    const row = mock.rows.find((r) => r.modelId === 'claude-opus-4-7');
    assert.ok(row);
    assert.equal(row?.source, 'litellm');
  } finally {
    await close();
  }
});

test('DELETE /models/override/:modelId requires API key', async () => {
  const { baseUrl, close } = await startServer();
  try {
    const res = await fetch(
      `${baseUrl}/api/dashboard/models/override/claude-opus-4-7`,
      { method: 'DELETE' },
    );
    assert.equal(res.status, 401);
  } finally {
    await close();
  }
});
