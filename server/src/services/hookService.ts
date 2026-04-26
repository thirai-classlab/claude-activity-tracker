import prisma from '../lib/prisma';
import { calculateCost } from './costCalculator';

// ---------------------------------------------------------------------------
// Healthcheck session filter (D-012 / spec 006)
// ---------------------------------------------------------------------------
// Hook installer / `aidd doctor` send synthetic SessionStart + Stop events
// with reserved session_uuid prefixes to verify the API endpoint. These rows
// must never land in the dashboard, otherwise they pollute KPIs (e.g. zero-
// token sessions inflate session counts). Reject at every handler entrypoint.
const HEALTHCHECK_SESSION_PREFIXES = [
  'install-healthcheck-',
  'doctor-healthcheck-',
] as const;

/**
 * Return true if the session_uuid is reserved for installer / doctor health
 * checks and must be skipped at every handler entrypoint.
 *
 * Pure, exported for unit tests.
 */
export function isHealthcheckSessionUuid(sessionUuid: string | undefined | null): boolean {
  if (typeof sessionUuid !== 'string' || sessionUuid.length === 0) return false;
  return HEALTHCHECK_SESSION_PREFIXES.some((prefix) => sessionUuid.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decide whether and how to update `session.model` from a stop-hook payload.
 *
 * Contract (see bug #6 / P2-T10):
 * - If `data.model` is a non-empty string AND not literally `'unknown'`,
 *   return `{ model: data.model }` so Prisma will overwrite the column.
 * - Otherwise return `{}` so the existing session.model value is preserved.
 *
 * This replaces the earlier conditional update (`data.model ? ... : {}`) that
 * would silently write `'unknown'` over a real model name from session-start,
 * and which failed to refresh stale snapshots (e.g. `claude-opus-4-6` never
 * updating to `claude-opus-4-7`).
 *
 * Pure, so it is unit-tested without a DB connection.
 */
export function resolveSessionModelUpdate(
  dataModel: string | undefined | null,
): { model: string } | Record<string, never> {
  if (typeof dataModel !== 'string') return {};
  if (dataModel.length === 0) return {};
  if (dataModel === 'unknown') return {};
  return { model: dataModel };
}

/**
 * Decide which timestamp to use as `responseCompletedAt` for a turn during
 * `handleStop`'s response-text reconciliation pass.
 *
 * Contract (see bug #7 / P1.5-T2):
 * - If `responseCompletedAt` is provided (transcript-derived assistant
 *   timestamp), use it verbatim. This applies to BOTH the latest turn and
 *   earlier turns — the transcript is the source of truth.
 * - If `responseCompletedAt` is missing AND this is the latest turn, fall
 *   back to `now` (hook fire time). This preserves the previous behavior for
 *   sessions where the parser failed to extract a final assistant timestamp.
 * - Otherwise (missing on a non-latest turn), return `null` so duration
 *   computation is skipped for this turn.
 *
 * Previously the latest turn unconditionally used `now`, which inflated
 * `durationMs` by user idle time after the assistant finished responding.
 *
 * Pure, so it is unit-tested without a DB connection.
 */
export function resolveResponseTime(
  responseCompletedAt: string | null | undefined,
  isLatestTurn: boolean,
  now: Date,
): Date | null {
  if (responseCompletedAt) {
    return new Date(responseCompletedAt);
  }
  if (isLatestTurn) {
    return now;
  }
  return null;
}

/**
 * Shape of the per-call payload that `handleStop` writes to a session row's
 * token/cost columns. Exported for unit tests of `buildSessionTokenUpdate`.
 *
 * Keys mirror the Prisma `Session` model field names (camelCase) so the
 * returned object can be spread directly into `prisma.session.update.data`.
 */
export interface SessionTokenUpdate {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  estimatedCost: number;
  subagentInputTokens: number;
  subagentOutputTokens: number;
  subagentCacheCreationTokens: number;
  subagentCacheReadTokens: number;
  subagentEstimatedCost: number;
}

interface MainAgentTokens {
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cache_creation_tokens?: number;
  total_cache_read_tokens?: number;
}

interface SubagentAggregateSums {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheCreationTokens?: number | null;
  cacheReadTokens?: number | null;
  estimatedCost?: number | null;
}

/**
 * Build the `Session` token/cost update payload for `handleStop`.
 *
 * Contract (see bug #4 / P1.5-T4):
 * - `total_*` / `estimated_cost` columns hold MAIN agent values only.
 * - `subagent_*` columns hold the aggregated subagent figures verbatim.
 * - Grand totals are deliberately NOT pre-computed here; UI / dashboard
 *   readers add them as `total_* + subagent_*` so the same row never
 *   double-counts the subagent slice when both panels are shown.
 *
 * Idempotency: calling this twice with the same inputs (e.g. a stop hook
 * fires twice for the same session) yields the exact same payload, since
 * the subagent aggregate is supplied by the caller via Prisma's
 * `subagent.aggregate({ where: { sessionId } })` — already a pure SUM over
 * the current DB state, not an incremental delta.
 *
 * Pure, exported for unit tests.
 */
export function buildSessionTokenUpdate(
  mainAgent: MainAgentTokens,
  mainAgentCost: number,
  subAgg: SubagentAggregateSums,
): SessionTokenUpdate {
  return {
    totalInputTokens: mainAgent.total_input_tokens ?? 0,
    totalOutputTokens: mainAgent.total_output_tokens ?? 0,
    totalCacheCreationTokens: mainAgent.total_cache_creation_tokens ?? 0,
    totalCacheReadTokens: mainAgent.total_cache_read_tokens ?? 0,
    estimatedCost: mainAgentCost,
    subagentInputTokens: subAgg.inputTokens ?? 0,
    subagentOutputTokens: subAgg.outputTokens ?? 0,
    subagentCacheCreationTokens: subAgg.cacheCreationTokens ?? 0,
    subagentCacheReadTokens: subAgg.cacheReadTokens ?? 0,
    subagentEstimatedCost: subAgg.estimatedCost ?? 0,
  };
}

/**
 * Normalize a prompt text string for stable cross-source comparison.
 *
 * Used to match transcript-side promptText (from response_texts) against
 * DB-side promptText (recorded by the prompt hook). Must be deterministic
 * and tolerate minor formatting drift:
 * - newline → space
 * - trailing "..." (added when the prompt hook truncates) is stripped
 * - leading/trailing whitespace trimmed
 * - first 150 chars taken (matches the prompt hook truncation budget)
 *
 * Pure, exported for unit tests.
 */
export function normalizePromptKey(text: string): string {
  return text.replace(/\n/g, ' ').replace(/\.\.\.$/, '').trim().substring(0, 150);
}

interface DbTurnForMatching {
  id: number;
  turnNumber: number;
  promptText: string | null;
}

interface ResponseTextForMatching {
  turnIndex?: number | null;
  promptText?: string;
}

/**
 * Build a map from transcript-side `turnIndex` to DB-side `Turn.id` using a
 * 2-stage matching strategy.
 *
 * Contract (see bug #2 / P1.5-T3):
 *
 * Stage 1 — Key match (preferred):
 *   For each response_text with a non-empty promptText, find the first
 *   DB turn whose normalized promptText is identical. Consume that DB
 *   turn from the unmatched pool so it cannot be reused.
 *
 * Stage 2 — Positional fallback:
 *   If a response_text did not key-match in stage 1 AND there are still
 *   unmatched DB turns, pair it with the oldest unmatched DB turn (FIFO).
 *
 * Both stages are evaluated per response_text in the order they appear.
 * This means a key match later in the list cannot "steal" a DB turn that
 * was already taken by a positional fallback for an earlier response_text.
 * In practice this is the safest choice: response_texts are also ordered
 * by turnIndex, so positional fallback for index N consumes a DB turn
 * earlier than positional fallback for index N+1.
 *
 * Notes:
 * - DB turns must already be sorted by turnNumber asc (oldest first) by
 *   the caller — `handleStop` does this via Prisma `orderBy`.
 * - response_texts whose `turnIndex` is null/undefined are ignored.
 * - When the DB pool is exhausted (response_texts > dbTurns), excess
 *   transcript indexes are dropped silently. This handles compaction.
 * - When dbTurns > response_texts, leftover DB turns simply stay unmapped.
 *
 * Pure, exported for unit tests.
 */
export function buildTurnIndexMap(
  dbTurns: ReadonlyArray<DbTurnForMatching>,
  responseTexts: ReadonlyArray<ResponseTextForMatching>,
): Map<number, number> {
  const turnIndexToDbId = new Map<number, number>();
  if (responseTexts.length === 0 || dbTurns.length === 0) {
    return turnIndexToDbId;
  }

  // Mutable pool, in turnNumber order (caller guarantees sort).
  const unmatched: DbTurnForMatching[] = [...dbTurns];

  for (const rt of responseTexts) {
    if (rt.turnIndex == null) continue;

    let matched: DbTurnForMatching | undefined;

    // Stage 1: key match
    if (rt.promptText) {
      const promptKey = normalizePromptKey(rt.promptText);
      if (promptKey) {
        const idx = unmatched.findIndex((t) => {
          if (!t.promptText) return false;
          return normalizePromptKey(t.promptText) === promptKey;
        });
        if (idx >= 0) {
          matched = unmatched[idx];
          unmatched.splice(idx, 1);
        }
      }
    }

    // Stage 2: positional fallback (oldest unmatched DB turn)
    if (!matched && unmatched.length > 0) {
      matched = unmatched.shift();
    }

    if (matched) {
      turnIndexToDbId.set(rt.turnIndex, matched.id);
    }
    // else: DB pool is exhausted — silently skip (compaction case).
  }

  return turnIndexToDbId;
}

/**
 * Find or create a member by git_email (primary identifier).
 * Falls back to claude_account if git_email is not available.
 * Returns the member id, or null if neither identifier is valid.
 */
async function findOrCreateMember(
  gitEmail?: string,
  claudeAccount?: string
): Promise<number | null> {
  // Determine primary key: prefer git_email, fall back to claude_account
  const primaryEmail = (gitEmail && gitEmail !== '-' && gitEmail !== 'unknown')
    ? gitEmail
    : (claudeAccount && claudeAccount !== '-' && claudeAccount !== 'unknown')
      ? claudeAccount
      : null;

  if (!primaryEmail) return null;

  const member = await prisma.member.upsert({
    where: { gitEmail: primaryEmail },
    create: {
      gitEmail: primaryEmail,
      claudeAccount: claudeAccount || null,
    },
    update: {
      // Update claude_account if newly provided
      ...(claudeAccount ? { claudeAccount } : {}),
    },
  });

  return member.id;
}

/**
 * Find a session by UUID, or create a stub record if it doesn't exist.
 * This handles the case where hooks arrive out of order.
 * Returns the session id (numeric primary key).
 */
async function findOrCreateSession(sessionUuid: string): Promise<number> {
  const existing = await prisma.session.findUnique({
    where: { sessionUuid },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  // Create a stub session so that foreign key constraints are satisfied
  const created = await prisma.session.create({
    data: {
      sessionUuid,
      startedAt: new Date(),
    },
  });

  return created.id;
}

// ---------------------------------------------------------------------------
// 1. session-start
// ---------------------------------------------------------------------------

export async function handleSessionStart(data: {
  session_uuid: string;
  model?: string;
  source?: string;
  permission_mode?: string;
  cwd?: string;
  git_repo?: string;
  git_branch?: string;
  git_user?: string;
  claude_account?: string;
  ip_address?: string;
  started_at?: string;
}): Promise<void> {
  // Skip healthcheck sessions before any DB access. See spec 006 / D-012.
  if (isHealthcheckSessionUuid(data.session_uuid)) return;

  // Resolve member by git_user (primary) or claude_account (fallback)
  let memberId: number | null = null;
  if ((data.git_user && data.git_user !== '-' && data.git_user !== 'unknown') ||
      (data.claude_account && data.claude_account !== '-' && data.claude_account !== 'unknown')) {
    memberId = await findOrCreateMember(data.git_user, data.claude_account);
  }

  // Upsert session (may be a resume/compact/clear restart)
  await prisma.session.upsert({
    where: { sessionUuid: data.session_uuid },
    create: {
      sessionUuid: data.session_uuid,
      memberId,
      model: data.model || null,
      source: data.source || null,
      permissionMode: data.permission_mode || null,
      cwd: data.cwd || null,
      gitRepo: data.git_repo || null,
      gitBranch: data.git_branch || null,
      ipAddress: data.ip_address || null,
      startedAt: data.started_at ? new Date(data.started_at) : new Date(),
    },
    update: {
      ...(data.model ? { model: data.model } : {}),
      ...(data.source ? { source: data.source } : {}),
      ...(data.permission_mode ? { permissionMode: data.permission_mode } : {}),
      ...(data.cwd ? { cwd: data.cwd } : {}),
      ...(data.git_repo ? { gitRepo: data.git_repo } : {}),
      ...(data.git_branch ? { gitBranch: data.git_branch } : {}),
      ...(data.ip_address ? { ipAddress: data.ip_address } : {}),
      ...(memberId !== null ? { memberId } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// 2. prompt — create a turn record
// ---------------------------------------------------------------------------

export async function handlePrompt(data: {
  session_uuid: string;
  prompt_text?: string;
  submitted_at?: string;
}): Promise<void> {
  if (isHealthcheckSessionUuid(data.session_uuid)) return;
  const sessionId = await findOrCreateSession(data.session_uuid);
  const turnCount = await prisma.turn.count({ where: { sessionId } });

  await prisma.turn.create({
    data: {
      sessionId,
      turnNumber: turnCount + 1,
      promptText: data.prompt_text?.substring(0, 500) || null,
      promptSubmittedAt: data.submitted_at ? new Date(data.submitted_at) : new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// 3. subagent-start
// ---------------------------------------------------------------------------

export async function handleSubagentStart(data: {
  session_uuid: string;
  agent_uuid: string;
  agent_type: string;
  started_at?: string;
}): Promise<void> {
  if (isHealthcheckSessionUuid(data.session_uuid)) return;
  const sessionId = await findOrCreateSession(data.session_uuid);

  // Find the latest turn for this session to associate with
  const latestTurn = await prisma.turn.findFirst({
    where: { sessionId },
    orderBy: { turnNumber: 'desc' },
    select: { id: true },
  });

  await prisma.subagent.create({
    data: {
      sessionId,
      turnId: latestTurn?.id || null,
      agentUuid: data.agent_uuid,
      agentType: data.agent_type,
      startedAt: data.started_at ? new Date(data.started_at) : new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// 4. subagent-stop
// ---------------------------------------------------------------------------

export async function handleSubagentStop(data: {
  session_uuid: string;
  agent_uuid: string;
  agent_type: string;
  stopped_at?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  tool_uses?: Array<{
    tool_use_uuid: string;
    tool_name: string;
    tool_category: string;
    tool_input_summary: string;
    status: string;
    error_message?: string;
  }>;
  agent_model?: string;
  description?: string;
  file_changes?: Array<{ file_path: string; operation: string }>;
}): Promise<void> {
  if (isHealthcheckSessionUuid(data.session_uuid)) return;

  // Find the subagent record
  const subagent = await prisma.subagent.findUnique({
    where: { agentUuid: data.agent_uuid },
  });

  if (!subagent) {
    // Subagent not found — may have been created out of order or skipped.
    // Silently return to avoid crashing the hook pipeline.
    return;
  }

  const sessionId = await findOrCreateSession(data.session_uuid);

  // Calculate duration from start to stop
  const stoppedAt = data.stopped_at ? new Date(data.stopped_at) : new Date();
  const durationSeconds = subagent.startedAt
    ? Math.round((stoppedAt.getTime() - subagent.startedAt.getTime()) / 1000)
    : null;

  // Calculate cost
  const model = data.agent_model || 'unknown';
  const cost = await calculateCost(model, {
    inputTokens: data.input_tokens || 0,
    outputTokens: data.output_tokens || 0,
    cacheCreationTokens: data.cache_creation_tokens || 0,
    cacheReadTokens: data.cache_read_tokens || 0,
  });

  // Update the subagent record
  await prisma.subagent.update({
    where: { id: subagent.id },
    data: {
      stoppedAt,
      durationSeconds,
      agentModel: model,
      description: data.description || null,
      inputTokens: data.input_tokens || 0,
      outputTokens: data.output_tokens || 0,
      cacheCreationTokens: data.cache_creation_tokens || 0,
      cacheReadTokens: data.cache_read_tokens || 0,
      estimatedCost: cost,
      toolUseCount: data.tool_uses?.length || 0,
    },
  });

  // Create tool_use records for each tool the subagent used
  if (data.tool_uses?.length) {
    await prisma.toolUse.createMany({
      data: data.tool_uses.map((t) => {
        const name = t.tool_name || '';
        return {
          sessionId,
          subagentId: subagent.id,
          turnId: subagent.turnId,
          toolUseUuid: t.tool_use_uuid || '',
          toolName: name,
          toolCategory: t.tool_category || null,
          toolInputSummary: t.tool_input_summary || null,
          status: t.status || 'success',
          errorMessage: t.error_message || null,
          isMcp: name.startsWith('mcp__'),
          mcpServer: name.startsWith('mcp__')
            ? name.split('__')[1] || null
            : null,
        };
      }),
    });
  }

  // Create file_change records for subagent file operations, linked to tool_uses
  if (data.file_changes?.length) {
    // Query back the Write/Edit tool uses to link file changes via toolUseId
    const fileToolUses = await prisma.toolUse.findMany({
      where: {
        subagentId: subagent.id,
        toolName: { in: ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'] },
      },
      select: { id: true, toolName: true, toolInputSummary: true },
    });

    await prisma.fileChange.createMany({
      data: data.file_changes.map((f) => {
        // Match file change to its tool use by operation + file path
        const matched = fileToolUses.find(
          (tu) => tu.toolName.toLowerCase() === f.operation && tu.toolInputSummary === f.file_path,
        );
        return {
          sessionId,
          turnId: subagent.turnId,
          toolUseId: matched?.id || null,
          filePath: f.file_path,
          operation: f.operation,
        };
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// 5. stop — major session update with all parsed transcript data
// ---------------------------------------------------------------------------

export async function handleStop(data: {
  session_uuid: string;
  stopped_at?: string;
  claude_account?: string;
  git_user?: string;
  git_repo?: string;
  git_branch?: string;
  ip_address?: string;
  model?: string;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cache_creation_tokens?: number;
  total_cache_read_tokens?: number;
  turn_count?: number;
  tool_use_count?: number;
  compact_count?: number;
  error_count?: number;
  summary?: string;
  tool_uses?: Array<{
    tool_use_uuid: string;
    tool_name: string;
    tool_category: string;
    tool_input_summary: string;
    status: string;
    error_message?: string;
    turn_index?: number | null;
  }>;
  file_changes?: Array<{ file_path: string; operation: string; turn_index?: number | null }>;
  session_events?: Array<{
    event_type: string;
    event_subtype?: string;
    event_data?: Record<string, unknown>;
  }>;
  turn_durations?: Array<{ durationMs: number }>;
  response_texts?: Array<{ text: string; model?: string; stopReason?: string; inputTokens?: number; outputTokens?: number; cacheCreationTokens?: number; cacheReadTokens?: number; responseCompletedAt?: string | null; promptText?: string; turnIndex?: number | null }>;
}): Promise<void> {
  if (isHealthcheckSessionUuid(data.session_uuid)) return;

  // Find or create session
  const sessionId = await findOrCreateSession(data.session_uuid);

  // Handle member by git_user (primary) or claude_account (fallback)
  let memberId: number | null = null;
  if ((data.git_user && data.git_user !== '-' && data.git_user !== 'unknown') ||
      (data.claude_account && data.claude_account !== '-' && data.claude_account !== 'unknown')) {
    memberId = await findOrCreateMember(data.git_user, data.claude_account);
  }

  // Calculate cost
  const model = data.model || 'unknown';
  const cost = await calculateCost(model, {
    inputTokens: data.total_input_tokens || 0,
    outputTokens: data.total_output_tokens || 0,
    cacheCreationTokens: data.total_cache_creation_tokens || 0,
    cacheReadTokens: data.total_cache_read_tokens || 0,
  });

  // Count and aggregate subagent tokens/cost for this session
  const subagentCount = await prisma.subagent.count({ where: { sessionId } });
  const subAgg = await prisma.subagent.aggregate({
    where: { sessionId },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      estimatedCost: true,
    },
  });

  // Update session with aggregated data (main agent + subagent tokens)
  // NOTE: `data.model` comes from the transcript parser and represents the
  // most recent assistant model actually used in the session. We always
  // overwrite the session snapshot unless the parser reported 'unknown'
  // (no reliable value). See bug #6 and docs/tasks/phase-2-*.md (P2-T10).
  const sessionModelUpdate = resolveSessionModelUpdate(data.model);
  // Main agent totals go to `total_*` / `estimatedCost`; subagent aggregates
  // go to the dedicated `subagent_*` columns. Grand totals are added at the
  // read site so subagent figures aren't double-counted in the UI.
  // See bug #4 / docs/specs/004-phase1-remaining-bugs.md (P1.5-T4).
  const tokenUpdate = buildSessionTokenUpdate(
    {
      total_input_tokens: data.total_input_tokens,
      total_output_tokens: data.total_output_tokens,
      total_cache_creation_tokens: data.total_cache_creation_tokens,
      total_cache_read_tokens: data.total_cache_read_tokens,
    },
    cost,
    subAgg._sum,
  );
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      ...(memberId !== null ? { memberId } : {}),
      ...sessionModelUpdate,
      ...(data.git_repo ? { gitRepo: data.git_repo } : {}),
      ...(data.git_branch ? { gitBranch: data.git_branch } : {}),
      ...(data.ip_address ? { ipAddress: data.ip_address } : {}),
      ...tokenUpdate,
      // turnCount / toolUseCount are recomputed from DB below, after tool_uses
      // insert. Transcript-derived counts (data.turn_count / data.tool_use_count)
      // are intentionally ignored to avoid inflation from duplicated assistant
      // messages or other transcript-side dedup issues.
      // See docs/specs/001-transcript-dedup.md (P1-T3).
      subagentCount,
      compactCount: data.compact_count || 0,
      errorCount: data.error_count || 0,
      summary: data.summary || null,
    },
  });

  // Build turn matching map: transcript turnIndex -> DB turnId
  // Uses promptText as the matching key (set by prompt hook, compared to transcript)
  const dbTurns = await prisma.turn.findMany({
    where: { sessionId },
    orderBy: { turnNumber: 'asc' },
    select: { id: true, promptText: true, turnNumber: true },
  });

  // Build turnIndex -> DB turnId map using a 2-stage strategy:
  //   1. key match on normalized promptText
  //   2. positional fallback (oldest unmatched DB turn) when key match fails
  //
  // The fallback is the bug #2 / P1.5-T3 fix: previously, a single key
  // mismatch caused the entire mapping to remain empty, which silently
  // dropped per-turn token / duration / response_text writes for that
  // session. See `buildTurnIndexMap` for the full contract.
  const turnIndexToDbId = buildTurnIndexMap(dbTurns, data.response_texts ?? []);

  // Helper: resolve turnIndex to DB turnId
  function resolveTurnId(turnIndex: number | null | undefined): number | null {
    if (turnIndex == null) return null;
    return turnIndexToDbId.get(turnIndex) ?? null;
  }

  // Create tool_use records (main agent's tool uses, subagentId = null)
  // Delete existing records first to prevent duplicates on re-runs
  if (data.tool_uses?.length) {
    await prisma.toolUse.deleteMany({ where: { sessionId, subagentId: null } });
    await prisma.toolUse.createMany({
      data: data.tool_uses.map((t) => {
        const name = t.tool_name || '';
        return {
          sessionId,
          turnId: resolveTurnId(t.turn_index),
          toolUseUuid: t.tool_use_uuid || '',
          toolName: name,
          toolCategory: t.tool_category || null,
          toolInputSummary: t.tool_input_summary || null,
          status: t.status || 'success',
          errorMessage: t.error_message || null,
          isMcp: name.startsWith('mcp__'),
          mcpServer: name.startsWith('mcp__')
            ? name.split('__')[1] || null
            : null,
        };
      }),
    });
  }

  // Create file_change records — only real modifications (write/edit), not snapshots
  // Delete existing and recreate to prevent duplicates on re-runs
  if (data.file_changes?.length) {
    await prisma.fileChange.deleteMany({ where: { sessionId, toolUseId: null } });
    // Filter out snapshot operations (file-history-snapshot)
    const realChanges = data.file_changes.filter(f => f.operation !== 'snapshot');
    if (realChanges.length) {
      await prisma.fileChange.createMany({
        data: realChanges.map((f) => ({
          sessionId,
          filePath: f.file_path,
          operation: f.operation,
          turnId: resolveTurnId(f.turn_index),
        })),
      });
    }
  }

  // Recompute turnCount / toolUseCount from DB ground truth.
  // - turnCount = number of turn rows (created by prompt hooks)
  // - toolUseCount = number of main-agent tool_use rows (subagentId = null)
  // This replaces the transcript-derived values which can be inflated by
  // duplicated assistant messages. See docs/specs/001-transcript-dedup.md.
  const dbTurnCount = await prisma.turn.count({ where: { sessionId } });
  const dbToolUseCount = await prisma.toolUse.count({
    where: { sessionId, subagentId: null },
  });
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      turnCount: dbTurnCount,
      toolUseCount: dbToolUseCount,
    },
  });

  // Create session_event records
  if (data.session_events?.length) {
    const validEvents = data.session_events
      .filter((e) => e.event_type) // skip records with undefined/null eventType
      .map((e) => ({
        sessionId,
        eventType: e.event_type,
        eventSubtype: e.event_subtype || null,
        eventData: e.event_data ? JSON.stringify(e.event_data) : null,
      }));
    if (validEvents.length) {
      await prisma.sessionEvent.createMany({ data: validEvents });
    }
  }

  // Update response texts using key-based matching (promptText -> DB turn)
  if (data.response_texts?.length) {
    const now = new Date();
    // Fetch full turn data for duration computation
    const fullDbTurns = await prisma.turn.findMany({
      where: { sessionId },
      orderBy: { turnNumber: 'asc' },
    });
    const fullTurnMap = new Map(fullDbTurns.map(t => [t.id, t]));

    for (let i = 0; i < data.response_texts.length; i++) {
      const rt = data.response_texts[i];
      const dbTurnId = resolveTurnId(rt.turnIndex);
      if (!dbTurnId) continue;

      const turn = fullTurnMap.get(dbTurnId);
      if (!turn) continue;

      const isLatestTurn = (i === data.response_texts.length - 1);
      // Prefer transcript timestamp for ALL turns (including latest); fall
      // back to `now` only when the latest turn has no transcript timestamp.
      // See bug #7 / docs/specs/004-phase1-remaining-bugs.md.
      const responseTime = resolveResponseTime(rt.responseCompletedAt, isLatestTurn, now);

      // Compute durationMs = responseTime - promptSubmittedAt
      let computedDurationMs: number | undefined;
      if (responseTime && turn.promptSubmittedAt) {
        const diff = responseTime.getTime() - turn.promptSubmittedAt.getTime();
        if (diff > 0) computedDurationMs = diff;
      }

      await prisma.turn.update({
        where: { id: dbTurnId },
        data: {
          responseText: rt.text?.substring(0, 65000) || null,
          ...(responseTime ? { responseCompletedAt: responseTime } : {}),
          ...(computedDurationMs != null ? { durationMs: computedDurationMs } : {}),
          ...(rt.model ? { model: rt.model } : {}),
          ...(rt.stopReason ? { stopReason: rt.stopReason } : {}),
          ...(rt.inputTokens != null ? { inputTokens: rt.inputTokens } : {}),
          ...(rt.outputTokens != null ? { outputTokens: rt.outputTokens } : {}),
          ...(rt.cacheCreationTokens != null ? { cacheCreationTokens: rt.cacheCreationTokens } : {}),
          ...(rt.cacheReadTokens != null ? { cacheReadTokens: rt.cacheReadTokens } : {}),
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. session-end
// ---------------------------------------------------------------------------

export async function handleSessionEnd(data: {
  session_uuid: string;
  reason?: string;
  ended_at?: string;
}): Promise<void> {
  if (isHealthcheckSessionUuid(data.session_uuid)) return;

  // Use findOrCreateSession to handle the case where session-end arrives
  // but session-start was missed (e.g., hook failure)
  const sessionId = await findOrCreateSession(data.session_uuid);

  // Fetch startedAt to compute duration
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { startedAt: true },
  });

  const endedAt = data.ended_at ? new Date(data.ended_at) : new Date();
  let durationMs: number | null = null;
  if (session?.startedAt) {
    durationMs = endedAt.getTime() - session.startedAt.getTime();
    if (durationMs < 0) durationMs = null;
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMs,
      endReason: data.reason || null,
    },
  });
}
