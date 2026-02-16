/**
 * Import data from remote Plesk API into local Docker MariaDB
 * Generates a single SQL file and executes it in one batch
 * Usage: npx tsx scripts/import-remote-db.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const REMOTE_API = 'https://ai-driven-analytics.sandboxes.jp';
const API_KEY = '5bbe50826c2070c24e40fb318f87dcd6add02d0737cdfa09796b2c7e6545ba97';
const DOCKER_CONTAINER = 'server-db-1';
const DB_USER = 'tracker';
const DB_PASS = 'trackerpass';
const DB_NAME = 'claude_tracker';
const SQL_FILE = join(process.cwd(), 'scripts', 'import-data.sql');

// ─── Helpers ───────────────────────────────────────────────────────────

async function fetchAPI<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${REMOTE_API}/api/dashboard${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

function toMySQLDatetime(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

function esc(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  let str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    str = toMySQLDatetime(str);
  }
  str = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return `'${str}'`;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Plesk DB → Local Docker Import ===\n');

  // Step 1: Fetch all sessions
  console.log('1. Fetching sessions from remote API...');
  const sessionsRes = await fetchAPI<{ data: any[]; total: number }>('/sessions', { per_page: 200 });
  console.log(`   Found ${sessionsRes.total} sessions\n`);

  // Step 2: Fetch all session details
  console.log('2. Fetching session details...');
  const details: any[] = [];
  for (const s of sessionsRes.data) {
    try {
      const detail = await fetchAPI<any>(`/sessions/${s.id}`);
      details.push(detail);
      console.log(`   #${s.id}: ${detail.turns?.length || 0} turns, ${(detail.sessionEvents || []).length} events`);
    } catch (e) {
      console.log(`   #${s.id}: SKIP (${e})`);
    }
  }

  // Step 3: Generate SQL
  console.log('\n3. Generating SQL...');
  const sql: string[] = [];

  sql.push('SET FOREIGN_KEY_CHECKS=0;');
  sql.push('SET NAMES utf8mb4;');
  for (const t of ['session_events', 'file_changes', 'tool_uses', 'subagents', 'turns', 'sessions', 'members']) {
    sql.push(`TRUNCATE TABLE ${t};`);
  }
  sql.push('SET FOREIGN_KEY_CHECKS=1;');

  // Member
  const memberEmail = 'thirai@classlab.co.jp';
  sql.push(`INSERT INTO members (id, git_email, created_at, updated_at) VALUES (1, ${esc(memberEmail)}, NOW(), NOW());`);

  // Sessions & related data - use variables for auto-increment tracking
  let sessionIdCounter = 0;
  let turnIdCounter = 0;
  let subagentIdCounter = 0;

  for (const d of details) {
    sessionIdCounter++;
    const sid = sessionIdCounter;

    sql.push(`INSERT INTO sessions (
      id, member_id, session_uuid, model, git_repo, git_branch,
      permission_mode, started_at, ended_at, end_reason,
      total_input_tokens, total_output_tokens,
      total_cache_creation_tokens, total_cache_read_tokens,
      estimated_cost, turn_count, tool_use_count, subagent_count,
      error_count, summary, created_at, updated_at
    ) VALUES (
      ${sid}, 1, ${esc(d.sessionUuid)}, ${esc(d.model)},
      ${esc(d.gitRepo)}, ${esc(d.gitBranch)},
      ${esc(d.permissionMode)},
      ${esc(d.startedAt)}, ${esc(d.endedAt)}, ${esc(d.endReason)},
      ${d.totalInputTokens || 0}, ${d.totalOutputTokens || 0},
      ${d.totalCacheCreationTokens || 0}, ${d.totalCacheReadTokens || 0},
      ${d.estimatedCost ?? 'NULL'}, ${d.turnCount || 0}, ${d.toolUseCount || 0},
      ${d.subagentCount || 0}, ${d.errorCount || 0},
      ${esc(d.summary)}, NOW(), NOW()
    );`);

    // Turns
    const turns = d.turns || [];
    for (const turn of turns) {
      turnIdCounter++;
      const tid = turnIdCounter;

      sql.push(`INSERT INTO turns (
        id, session_id, turn_number, prompt_text, prompt_submitted_at,
        duration_ms, input_tokens, output_tokens, created_at
      ) VALUES (
        ${tid}, ${sid}, ${turn.turnNumber},
        ${esc(turn.promptText)}, ${esc(turn.promptSubmittedAt)},
        ${turn.durationMs ?? 'NULL'}, ${turn.inputTokens || 0}, ${turn.outputTokens || 0},
        NOW()
      );`);

      // Tool uses for turn
      for (const tu of (turn.toolUses || [])) {
        sql.push(`INSERT INTO tool_uses (
          session_id, turn_id, tool_name, tool_category,
          tool_input_summary, status, error_message, created_at
        ) VALUES (
          ${sid}, ${tid}, ${esc(tu.toolName)},
          ${esc(tu.toolCategory)}, ${esc(tu.toolInputSummary)},
          ${esc(tu.status || 'success')}, ${esc(tu.errorMessage)},
          NOW()
        );`);
      }

      // File changes for turn
      for (const fc of (turn.fileChanges || [])) {
        sql.push(`INSERT INTO file_changes (
          session_id, turn_id, file_path, operation, created_at
        ) VALUES (
          ${sid}, ${tid}, ${esc(fc.filePath)},
          ${esc(fc.operation)}, NOW()
        );`);
      }

      // Subagents for turn
      for (let si = 0; si < (turn.subagents || []).length; si++) {
        subagentIdCounter++;
        const subId = subagentIdCounter;
        const sub = turn.subagents[si];
        const agentUuid = `${d.sessionUuid}-t${turn.turnNumber}-s${si}`;

        sql.push(`INSERT INTO subagents (
          id, session_id, turn_id, agent_uuid, agent_type, agent_model,
          description, duration_seconds,
          input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
          estimated_cost, tool_use_count, created_at
        ) VALUES (
          ${subId}, ${sid}, ${tid}, ${esc(agentUuid)},
          ${esc(sub.agentType)}, ${esc(sub.agentModel)},
          ${esc(sub.description)}, ${sub.durationSeconds ?? 'NULL'},
          ${sub.inputTokens || 0}, ${sub.outputTokens || 0},
          ${sub.cacheCreationTokens || 0}, ${sub.cacheReadTokens || 0},
          ${sub.estimatedCost ?? 'NULL'}, ${(sub.toolUses || []).length},
          NOW()
        );`);

        // Tool uses for subagent
        for (const stu of (sub.toolUses || [])) {
          sql.push(`INSERT INTO tool_uses (
            session_id, turn_id, subagent_id, tool_name, tool_category,
            status, created_at
          ) VALUES (
            ${sid}, ${tid}, ${subId},
            ${esc(stu.toolName)}, ${esc(stu.toolCategory)},
            ${esc(stu.status || 'success')}, NOW()
          );`);
        }
      }
    }

    // Session events
    for (const ev of (d.sessionEvents || [])) {
      const evData = typeof ev.eventData === 'string'
        ? ev.eventData
        : (ev.eventData ? JSON.stringify(ev.eventData) : null);
      sql.push(`INSERT INTO session_events (
        session_id, event_type, event_subtype, event_data, occurred_at, created_at
      ) VALUES (
        ${sid}, ${esc(ev.eventType)}, ${esc(ev.eventSubtype)},
        ${esc(evData)}, ${esc(ev.occurredAt)}, NOW()
      );`);
    }
  }

  // Write SQL file
  const sqlContent = sql.join('\n');
  writeFileSync(SQL_FILE, sqlContent, 'utf-8');
  console.log(`   Generated ${sql.length} SQL statements (${(sqlContent.length / 1024).toFixed(1)} KB)\n`);

  // Step 4: Execute
  console.log('4. Copying SQL to Docker container...');
  execSync(`docker cp ${SQL_FILE} ${DOCKER_CONTAINER}:/tmp/import.sql`, { stdio: 'pipe' });

  console.log('5. Executing SQL...');
  execSync(
    `docker exec ${DOCKER_CONTAINER} mariadb -u ${DB_USER} -p${DB_PASS} ${DB_NAME} -e "source /tmp/import.sql"`,
    { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
  );

  // Step 5: Verify
  console.log('\n=== Verification ===');
  const counts = execSync(
    `docker exec ${DOCKER_CONTAINER} mariadb -u ${DB_USER} -p${DB_PASS} ${DB_NAME} -N -e "
      SELECT 'sessions', COUNT(*) FROM sessions
      UNION ALL SELECT 'turns', COUNT(*) FROM turns
      UNION ALL SELECT 'tool_uses', COUNT(*) FROM tool_uses
      UNION ALL SELECT 'subagents', COUNT(*) FROM subagents
      UNION ALL SELECT 'file_changes', COUNT(*) FROM file_changes
      UNION ALL SELECT 'session_events', COUNT(*) FROM session_events
      UNION ALL SELECT 'members', COUNT(*) FROM members;"`,
    { encoding: 'utf-8' }
  );
  console.log(counts);
  console.log('=== Import Complete ===');
}

main().catch(console.error);
