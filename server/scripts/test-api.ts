/**
 * Automated API Test Script for Claude Activity Tracker
 *
 * Tests the full hook lifecycle and all dashboard GET endpoints.
 * Uses native fetch() (Node 18+).
 *
 * Usage:
 *   npx tsx scripts/test-api.ts
 *   npx tsx scripts/test-api.ts http://localhost:3001              # custom base URL
 *   API_KEY=abc123 npx tsx scripts/test-api.ts http://example.com  # custom API key
 */

import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'your-secret-api-key';
const SESSION_UUID = randomUUID();
const AGENT_UUID = randomUUID();
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);            // YYYY-MM-DD
const YESTERDAY = new Date(NOW.getTime() - 86400000).toISOString().slice(0, 10);
const TOMORROW = new Date(NOW.getTime() + 86400000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    results.push({ name, passed: true, durationMs: duration });
    console.log(`  \x1b[32mPASS\x1b[0m  ${name} (${duration.toFixed(0)}ms)`);
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, durationMs: duration, error: message });
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name} (${duration.toFixed(0)}ms)`);
    console.log(`        ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hookPost(path: string, body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(`${BASE_URL}/api/hook/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function dashboardGet(path: string, query?: Record<string, string>): Promise<Response> {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${BASE_URL}/api/dashboard/${path}${qs}`);
  return res;
}

function assertOk(res: Response, context: string): void {
  if (!res.ok) {
    throw new Error(`${context}: expected 2xx, got ${res.status}`);
  }
}

async function assertJsonOk(res: Response, context: string): Promise<unknown> {
  assertOk(res, context);
  const json = await res.json();
  if (json === null || json === undefined) {
    throw new Error(`${context}: response body is null/undefined`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// 1. Health endpoint
// ---------------------------------------------------------------------------

async function testHealth(): Promise<void> {
  await runTest('GET /health', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const json = (await assertJsonOk(res, '/health')) as Record<string, unknown>;
    if (json.status !== 'ok') {
      throw new Error(`Expected status "ok", got "${json.status}"`);
    }
  });
}

// ---------------------------------------------------------------------------
// 2. Hook lifecycle tests (in order)
// ---------------------------------------------------------------------------

async function testHookLifecycle(): Promise<void> {
  // 2a. session-start
  await runTest('POST /api/hook/session-start', async () => {
    const res = await hookPost('session-start', {
      session_uuid: SESSION_UUID,
      model: 'claude-sonnet-4-20250514',
      cwd: '/home/testuser/project',
      git_repo: 'test-org/test-repo',
      git_branch: 'main',
      git_user: 'api-test@example.com',
      started_at: NOW.toISOString(),
    });
    const json = (await assertJsonOk(res, 'session-start')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });

  // 2b. prompt
  await runTest('POST /api/hook/prompt', async () => {
    const res = await hookPost('prompt', {
      session_uuid: SESSION_UUID,
      prompt_text: 'Write a test script for the API',
      submitted_at: NOW.toISOString(),
    });
    const json = (await assertJsonOk(res, 'prompt')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });

  // 2c. subagent-start
  await runTest('POST /api/hook/subagent-start', async () => {
    const res = await hookPost('subagent-start', {
      session_uuid: SESSION_UUID,
      agent_uuid: AGENT_UUID,
      agent_type: 'task',
      started_at: NOW.toISOString(),
    });
    const json = (await assertJsonOk(res, 'subagent-start')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });

  // 2d. subagent-stop
  await runTest('POST /api/hook/subagent-stop', async () => {
    const res = await hookPost('subagent-stop', {
      session_uuid: SESSION_UUID,
      agent_uuid: AGENT_UUID,
      agent_type: 'task',
      stopped_at: new Date(NOW.getTime() + 5000).toISOString(),
      input_tokens: 1200,
      output_tokens: 800,
      agent_model: 'claude-haiku-3-20250414',
      tool_uses: [
        {
          tool_use_uuid: randomUUID(),
          tool_name: 'Read',
          tool_category: 'file',
          tool_input_summary: 'Read src/index.ts',
          status: 'success',
        },
      ],
    });
    const json = (await assertJsonOk(res, 'subagent-stop')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });

  // 2e. stop
  await runTest('POST /api/hook/stop', async () => {
    const res = await hookPost('stop', {
      session_uuid: SESSION_UUID,
      model: 'claude-sonnet-4-20250514',
      git_user: 'api-test@example.com',
      git_repo: 'test-org/test-repo',
      total_input_tokens: 25000,
      total_output_tokens: 8000,
      turn_count: 1,
      tool_use_count: 3,
      tool_uses: [
        {
          tool_use_uuid: randomUUID(),
          tool_name: 'Read',
          tool_category: 'file',
          tool_input_summary: 'Read package.json',
          status: 'success',
        },
        {
          tool_use_uuid: randomUUID(),
          tool_name: 'Write',
          tool_category: 'file',
          tool_input_summary: 'Write scripts/test-api.ts',
          status: 'success',
        },
        {
          tool_use_uuid: randomUUID(),
          tool_name: 'Bash',
          tool_category: 'shell',
          tool_input_summary: 'npm test',
          status: 'success',
        },
      ],
      file_changes: [
        { file_path: 'scripts/test-api.ts', operation: 'create' },
        { file_path: 'package.json', operation: 'modify' },
      ],
      session_events: [
        { event_type: 'turn_duration', event_subtype: 'turn_1', event_data: { durationMs: 4500 } },
      ],
    });
    const json = (await assertJsonOk(res, 'stop')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });

  // 2f. session-end
  await runTest('POST /api/hook/session-end', async () => {
    const res = await hookPost('session-end', {
      session_uuid: SESSION_UUID,
      reason: 'user_exit',
      ended_at: new Date(NOW.getTime() + 60000).toISOString(),
    });
    const json = (await assertJsonOk(res, 'session-end')) as Record<string, unknown>;
    if (json.ok !== true) {
      throw new Error(`Expected { ok: true }, got ${JSON.stringify(json)}`);
    }
  });
}

// ---------------------------------------------------------------------------
// 3. Hook auth test — should reject without API key
// ---------------------------------------------------------------------------

async function testHookAuth(): Promise<void> {
  await runTest('POST /api/hook/session-start (no API key => 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/hook/session-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_uuid: randomUUID() }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Dashboard GET endpoints
// ---------------------------------------------------------------------------

const DASHBOARD_ENDPOINTS = [
  'stats',
  'daily',
  'members',
  'repos',
  'tools',
  'costs',
  'sessions',
  'heatmap',
  'filters',
  'repo-date-heatmap',
  'member-date-heatmap',
  'productivity',
  'security',
] as const;

async function testDashboardEndpoints(): Promise<void> {
  const dateParams = { from: YESTERDAY, to: TOMORROW };

  for (const endpoint of DASHBOARD_ENDPOINTS) {
    await runTest(`GET /api/dashboard/${endpoint}`, async () => {
      // filters endpoint does not use date params
      const query = endpoint === 'filters' ? undefined : dateParams;
      const res = await dashboardGet(endpoint, query);
      await assertJsonOk(res, `/api/dashboard/${endpoint}`);
    });
  }
}

// ---------------------------------------------------------------------------
// 5. Dashboard edge cases
// ---------------------------------------------------------------------------

async function testDashboardEdgeCases(): Promise<void> {
  // sessions with pagination
  await runTest('GET /api/dashboard/sessions (pagination)', async () => {
    const res = await dashboardGet('sessions', {
      from: YESTERDAY,
      to: TOMORROW,
      page: '1',
      per_page: '10',
    });
    await assertJsonOk(res, '/api/dashboard/sessions?page=1&per_page=10');
  });

  // sessions with member filter
  await runTest('GET /api/dashboard/sessions (member filter)', async () => {
    const res = await dashboardGet('sessions', {
      from: YESTERDAY,
      to: TOMORROW,
      member: 'api-test@example.com',
    });
    await assertJsonOk(res, '/api/dashboard/sessions?member=api-test@example.com');
  });

  // stats with repo filter
  await runTest('GET /api/dashboard/stats (repo filter)', async () => {
    const res = await dashboardGet('stats', {
      from: YESTERDAY,
      to: TOMORROW,
      repo: 'test-org/test-repo',
    });
    await assertJsonOk(res, '/api/dashboard/stats?repo=test-org/test-repo');
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const totalTime = results.reduce((s, r) => s + r.durationMs, 0);

  if (failed === 0) {
    console.log(`\x1b[32m  ALL TESTS PASSED: ${passed}/${total}\x1b[0m  (${totalTime.toFixed(0)}ms)`);
  } else {
    console.log(`\x1b[31m  FAILED: ${failed}/${total}\x1b[0m  (${totalTime.toFixed(0)}ms)`);
    console.log('\n  Failed tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - ${r.name}: ${r.error}`);
    }
  }
  console.log('='.repeat(60) + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nClaude Activity Tracker — API Test Suite`);
  console.log(`Base URL:     ${BASE_URL}`);
  console.log(`Session UUID: ${SESSION_UUID}`);
  console.log(`Date range:   ${YESTERDAY} .. ${TOMORROW}`);
  console.log('='.repeat(60));

  // Check server is reachable
  try {
    await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`\n\x1b[31mERROR: Server is not reachable at ${BASE_URL}\x1b[0m`);
    console.error('Make sure the server is running: npm run dev\n');
    process.exit(1);
  }

  console.log('\n--- Health ---');
  await testHealth();

  console.log('\n--- Hook Lifecycle ---');
  await testHookLifecycle();

  console.log('\n--- Hook Auth ---');
  await testHookAuth();

  console.log('\n--- Dashboard Endpoints ---');
  await testDashboardEndpoints();

  console.log('\n--- Dashboard Edge Cases ---');
  await testDashboardEdgeCases();

  printSummary();

  // Exit with non-zero if any test failed
  const failed = results.filter((r) => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

main();
