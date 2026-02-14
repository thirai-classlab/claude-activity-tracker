import prisma from '../lib/prisma';
import { calculateCost } from './costCalculator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
}): Promise<void> {
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
  const cost = calculateCost(model, {
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
  }>;
  file_changes?: Array<{ file_path: string; operation: string }>;
  session_events?: Array<{
    event_type: string;
    event_subtype?: string;
    event_data?: Record<string, unknown>;
  }>;
  turn_durations?: Array<{ durationMs: number }>;
}): Promise<void> {
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
  const cost = calculateCost(model, {
    inputTokens: data.total_input_tokens || 0,
    outputTokens: data.total_output_tokens || 0,
    cacheCreationTokens: data.total_cache_creation_tokens || 0,
    cacheReadTokens: data.total_cache_read_tokens || 0,
  });

  // Count subagents for this session
  const subagentCount = await prisma.subagent.count({ where: { sessionId } });

  // Update session with aggregated data
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      ...(memberId !== null ? { memberId } : {}),
      ...(data.model ? { model: data.model } : {}),
      ...(data.git_repo ? { gitRepo: data.git_repo } : {}),
      ...(data.git_branch ? { gitBranch: data.git_branch } : {}),
      ...(data.ip_address ? { ipAddress: data.ip_address } : {}),
      totalInputTokens: data.total_input_tokens || 0,
      totalOutputTokens: data.total_output_tokens || 0,
      totalCacheCreationTokens: data.total_cache_creation_tokens || 0,
      totalCacheReadTokens: data.total_cache_read_tokens || 0,
      estimatedCost: cost,
      turnCount: data.turn_count || 0,
      toolUseCount: data.tool_use_count || 0,
      subagentCount,
      compactCount: data.compact_count || 0,
      errorCount: data.error_count || 0,
      summary: data.summary || null,
    },
  });

  // Create tool_use records (main agent's tool uses, subagentId = null)
  if (data.tool_uses?.length) {
    await prisma.toolUse.createMany({
      data: data.tool_uses.map((t) => {
        const name = t.tool_name || '';
        return {
          sessionId,
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

  // Create file_change records
  if (data.file_changes?.length) {
    await prisma.fileChange.createMany({
      data: data.file_changes.map((f) => ({
        sessionId,
        filePath: f.file_path,
        operation: f.operation,
      })),
    });
  }

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

  // Update turn durations if provided
  if (data.turn_durations?.length) {
    const turns = await prisma.turn.findMany({
      where: { sessionId },
      orderBy: { turnNumber: 'asc' },
    });

    const count = Math.min(turns.length, data.turn_durations.length);
    for (let i = 0; i < count; i++) {
      await prisma.turn.update({
        where: { id: turns[i].id },
        data: {
          durationMs: data.turn_durations[i].durationMs,
          responseCompletedAt: new Date(),
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
  // Use findOrCreateSession to handle the case where session-end arrives
  // but session-start was missed (e.g., hook failure)
  const sessionId = await findOrCreateSession(data.session_uuid);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      endedAt: data.ended_at ? new Date(data.ended_at) : new Date(),
      endReason: data.reason || null,
    },
  });
}
