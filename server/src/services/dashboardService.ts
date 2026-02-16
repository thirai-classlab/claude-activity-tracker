import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string;   // ISO date string (YYYY-MM-DD)
  to?: string;     // ISO date string (YYYY-MM-DD)
  member?: string; // git_email (primary member identifier)
  repo?: string;   // git_repo
  model?: string;  // model name
}

// ─── Cost Table (per 1M tokens) ─────────────────────────────────────────────

const COST_TABLE: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6':              { input: 15,   output: 75,  cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-sonnet-4-5-20250929':   { input: 3,    output: 15,  cacheWrite: 3.75,  cacheRead: 0.30 },
  'claude-haiku-4-5-20251001':    { input: 0.80, output: 4,   cacheWrite: 1.00,  cacheRead: 0.08 },
};

function getCostRates(model: string | null) {
  if (!model) return COST_TABLE['claude-sonnet-4-5-20250929'];

  for (const [key, rates] of Object.entries(COST_TABLE)) {
    if (model.includes(key) || key.includes(model)) return rates;
  }
  if (model.includes('opus'))   return COST_TABLE['claude-opus-4-6'];
  if (model.includes('sonnet')) return COST_TABLE['claude-sonnet-4-5-20250929'];
  if (model.includes('haiku'))  return COST_TABLE['claude-haiku-4-5-20251001'];

  return COST_TABLE['claude-sonnet-4-5-20250929'];
}

// ─── Where-clause Builder ───────────────────────────────────────────────────

function buildSessionWhere(filters: DashboardFilters) {
  const where: any = {};
  if (filters.from) {
    where.startedAt = { ...where.startedAt, gte: new Date(filters.from) };
  }
  if (filters.to) {
    where.startedAt = { ...where.startedAt, lte: new Date(filters.to + 'T23:59:59Z') };
  }
  if (filters.member) {
    where.member = { gitEmail: filters.member };
  }
  if (filters.repo) {
    where.gitRepo = filters.repo;
  }
  if (filters.model) {
    where.model = filters.model;
  }
  return where;
}

/** Build a raw SQL WHERE clause fragment and params array for raw queries. */
function buildRawWhere(filters: DashboardFilters, tableAlias = 's') {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.from) {
    conditions.push(`${tableAlias}.started_at >= ?`);
    params.push(new Date(filters.from));
  }
  if (filters.to) {
    conditions.push(`${tableAlias}.started_at <= ?`);
    params.push(new Date(filters.to + 'T23:59:59Z'));
  }
  if (filters.member) {
    conditions.push(`m.git_email = ?`);
    params.push(filters.member);
  }
  if (filters.repo) {
    conditions.push(`${tableAlias}.git_repo = ?`);
    params.push(filters.repo);
  }
  if (filters.model) {
    conditions.push(`${tableAlias}.model = ?`);
    params.push(filters.model);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return { whereClause, params };
}

// ─── 1. getStats ────────────────────────────────────────────────────────────

export async function getStats(filters: DashboardFilters) {
  const where = buildSessionWhere(filters);

  // Exclude empty/stub sessions (0 tokens AND no summary)
  const nonStubWhere = {
    ...where,
    NOT: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      summary: null,
    },
  };

  const [sessionAgg, activeMembers, subagentAgg, toolUseAgg, repoCount, turnAgg] = await Promise.all([
    prisma.session.aggregate({
      where: nonStubWhere,
      _count: { id: true },
      _sum: {
        totalInputTokens: true,
        totalOutputTokens: true,
        totalCacheCreationTokens: true,
        totalCacheReadTokens: true,
        estimatedCost: true,
        subagentCount: true,
        toolUseCount: true,
        errorCount: true,
      },
      _avg: {
        estimatedCost: true,
      },
    }),
    prisma.session.findMany({
      where: nonStubWhere,
      select: { memberId: true },
      distinct: ['memberId'],
    }),
    prisma.subagent.aggregate({
      where: { session: nonStubWhere },
      _count: { id: true },
    }),
    prisma.toolUse.aggregate({
      where: { session: nonStubWhere },
      _count: { id: true },
    }),
    prisma.session.findMany({
      where: { ...nonStubWhere, gitRepo: { not: null } },
      select: { gitRepo: true },
      distinct: ['gitRepo'],
    }),
    // Count actual turns (not the session.turnCount column, which may be stale)
    prisma.turn.count({
      where: { session: nonStubWhere },
    }),
  ]);

  const totalSessions = sessionAgg._count.id;
  const totalInputTokens = sessionAgg._sum.totalInputTokens ?? 0;
  const totalCacheReadTokens = sessionAgg._sum.totalCacheReadTokens ?? 0;
  const cacheEfficiency = totalInputTokens > 0
    ? totalCacheReadTokens / totalInputTokens
    : 0;

  return {
    totalSessions,
    totalInputTokens,
    totalOutputTokens: sessionAgg._sum.totalOutputTokens ?? 0,
    totalCacheReadTokens,
    totalCacheCreationTokens: sessionAgg._sum.totalCacheCreationTokens ?? 0,
    totalCost: sessionAgg._sum.estimatedCost ?? 0,
    activeMembers: activeMembers.filter(m => m.memberId !== null).length,
    totalTurns: turnAgg,
    totalSubagents: subagentAgg._count.id,
    totalToolUses: toolUseAgg._count.id,
    errorCount: sessionAgg._sum.errorCount ?? 0,
    repoCount: repoCount.length,
    averageTurnsPerSession: totalSessions > 0
      ? Math.round((turnAgg / totalSessions) * 100) / 100
      : 0,
    averageCostPerSession: Math.round((sessionAgg._avg.estimatedCost ?? 0) * 10000) / 10000,
    cacheEfficiency: Math.round(cacheEfficiency * 10000) / 10000,
  };
}

// ─── 2. getDailyStats ───────────────────────────────────────────────────────

export async function getDailyStats(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  // Need a LEFT JOIN on members for the member filter
  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  const sql = `
    SELECT
      DATE(s.started_at) as date,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY DATE(s.started_at)
    ORDER BY DATE(s.started_at)
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    date: row.date,
    sessionCount: Number(row.sessionCount),
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
  }));
}

// ─── 3. getMemberStats ──────────────────────────────────────────────────────

export async function getMemberStats(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  // Always join members for grouping
  const joinClause = 'LEFT JOIN members m ON s.member_id = m.id';

  const sql = `
    SELECT
      m.git_email as gitEmail,
      m.display_name as displayName,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as estimatedCost,
      CAST(COALESCE((
        SELECT COUNT(*)
        FROM turns t
        WHERE t.session_id IN (
          SELECT s2.id FROM sessions s2 WHERE s2.member_id = s.member_id
        )
      ), 0) AS DOUBLE) as totalTurns
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY s.member_id
    ORDER BY totalTokens DESC
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    gitEmail: row.gitEmail ?? 'unknown',
    displayName: row.displayName ?? null,
    sessionCount: Number(row.sessionCount),
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    totalTokens: Number(row.totalTokens),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
    totalTurns: Number(row.totalTurns),
  }));
}

// ─── 4. getSubagentStats ────────────────────────────────────────────────────

export async function getSubagentStats(filters: DashboardFilters) {
  const where = buildSessionWhere(filters);
  const subagentWhere: any = { session: where };

  // byType: aggregate subagents grouped by agentType
  const subagents = await prisma.subagent.groupBy({
    by: ['agentType'],
    where: subagentWhere,
    _count: { id: true },
    _avg: { durationSeconds: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
    },
  });

  const byType = subagents.map(s => ({
    agentType: s.agentType,
    count: s._count.id,
    avgDuration: Math.round((s._avg.durationSeconds ?? 0) * 100) / 100,
    totalTokens: (s._sum.inputTokens ?? 0) + (s._sum.outputTokens ?? 0),
    estimatedCost: Math.round((s._sum.estimatedCost ?? 0) * 10000) / 10000,
  }));

  // topPrompts: most expensive subagent invocations
  const topPromptsRaw = await prisma.subagent.findMany({
    where: subagentWhere,
    orderBy: { estimatedCost: 'desc' },
    take: 20,
    select: {
      agentType: true,
      description: true,
      promptText: true,
      estimatedCost: true,
      session: {
        select: {
          member: {
            select: { displayName: true, gitEmail: true },
          },
        },
      },
    },
  });

  const topPrompts = topPromptsRaw.map(s => ({
    agentType: s.agentType,
    description: s.description ?? '',
    promptText: s.promptText ?? '',
    memberName: s.session.member?.displayName ?? s.session.member?.gitEmail ?? 'unknown',
    estimatedCost: Math.round((s.estimatedCost ?? 0) * 10000) / 10000,
  }));

  return { byType, topPrompts };
}

// ─── 5. getToolStats ────────────────────────────────────────────────────────

export async function getToolStats(filters: DashboardFilters) {
  const where = buildSessionWhere(filters);
  const toolWhere: any = { session: where };

  const tools = await prisma.toolUse.groupBy({
    by: ['toolName', 'toolCategory'],
    where: toolWhere,
    _count: { id: true },
  });

  // Get success/failure counts and subagent counts per tool
  const toolNames = [...new Set(tools.map(t => t.toolName))];
  if (toolNames.length === 0) return [];

  const [successCounts, failureCounts, subagentCounts] = await Promise.all([
    prisma.toolUse.groupBy({
      by: ['toolName'],
      where: { ...toolWhere, status: 'success' },
      _count: { id: true },
    }),
    prisma.toolUse.groupBy({
      by: ['toolName'],
      where: { ...toolWhere, status: { not: 'success' } },
      _count: { id: true },
    }),
    prisma.toolUse.groupBy({
      by: ['toolName'],
      where: { ...toolWhere, subagentId: { not: null } },
      _count: { id: true },
    }),
  ]);

  const successMap = new Map(successCounts.map(s => [s.toolName, s._count.id]));
  const failureMap = new Map(failureCounts.map(f => [f.toolName, f._count.id]));
  const subagentMap = new Map(subagentCounts.map(s => [s.toolName, s._count.id]));

  return tools
    .map(t => {
      const useCount = t._count.id;
      const successCount = successMap.get(t.toolName) ?? 0;
      const failureCount = failureMap.get(t.toolName) ?? 0;
      return {
        toolName: t.toolName,
        toolCategory: t.toolCategory ?? 'other',
        useCount,
        successCount,
        failureCount,
        successRate: useCount > 0 ? Math.round((successCount / useCount) * 10000) / 10000 : 0,
        inSubagentCount: subagentMap.get(t.toolName) ?? 0,
      };
    })
    .sort((a, b) => b.useCount - a.useCount);
}

// ─── 6. getCostStats ────────────────────────────────────────────────────────

export async function getCostStats(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  const sql = `
    SELECT
      DATE(s.started_at) as date,
      s.model,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as inputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as outputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as cacheCreation,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as cacheRead,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY DATE(s.started_at), s.model
    ORDER BY DATE(s.started_at)
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => {
    // If estimatedCost is already stored, prefer it; otherwise compute from tokens
    let cost = Number(row.estimatedCost);
    if (cost === 0) {
      const rates = getCostRates(row.model);
      cost =
        (Number(row.inputTokens) / 1_000_000) * rates.input +
        (Number(row.outputTokens) / 1_000_000) * rates.output +
        (Number(row.cacheCreation) / 1_000_000) * rates.cacheWrite +
        (Number(row.cacheRead) / 1_000_000) * rates.cacheRead;
    }

    return {
      date: row.date,
      model: row.model ?? 'unknown',
      cost: Math.round(cost * 10000) / 10000,
    };
  });
}

// ─── 7. getSessions ─────────────────────────────────────────────────────────

export async function getSessions(filters: DashboardFilters, page = 1, perPage = 50) {
  const where = buildSessionWhere(filters);
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(Math.max(1, perPage), 200);

  // Exclude empty/stub sessions (0 tokens AND no summary)
  const nonStubWhere = {
    ...where,
    NOT: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      summary: null,
    },
  };

  const [data, total] = await Promise.all([
    prisma.session.findMany({
      where: nonStubWhere,
      orderBy: { startedAt: 'desc' },
      skip: (safePage - 1) * safePerPage,
      take: safePerPage,
      select: {
        id: true,
        sessionUuid: true,
        member: {
          select: { gitEmail: true, displayName: true },
        },
        model: true,
        startedAt: true,
        endedAt: true,
        durationMs: true,
        totalInputTokens: true,
        totalOutputTokens: true,
        estimatedCost: true,
        turnCount: true,
        subagentCount: true,
        toolUseCount: true,
        gitRepo: true,
        summary: true,
        turns: {
          select: { id: true, promptText: true },
          orderBy: { turnNumber: 'asc' as const },
        },
      },
    }),
    prisma.session.count({ where: nonStubWhere }),
  ]);

  return {
    data: data.map(s => ({
      ...s,
      firstPrompt: s.turns?.[0]?.promptText ?? null,
      turnCount: s.turns.length,
      turns: undefined,
      startedAt: s.startedAt?.toISOString() ?? null,
      endedAt: s.endedAt?.toISOString() ?? null,
    })),
    total,
    page: safePage,
    perPage: safePerPage,
  };
}

// ─── 8. getSessionDetail ────────────────────────────────────────────────────

export async function getSessionDetail(id: number) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      member: {
        select: { gitEmail: true, displayName: true },
      },
      turns: {
        include: {
          toolUses: {
            where: { subagentId: null },
            select: {
              toolName: true,
              toolCategory: true,
              toolInputSummary: true,
              status: true,
              errorMessage: true,
            },
          },
          subagents: {
            select: {
              agentType: true,
              agentModel: true,
              description: true,
              startedAt: true,
              stoppedAt: true,
              durationSeconds: true,
              inputTokens: true,
              outputTokens: true,
              cacheCreationTokens: true,
              cacheReadTokens: true,
              estimatedCost: true,
              toolUses: {
                select: {
                  toolName: true,
                  toolCategory: true,
                  status: true,
                },
              },
            },
            orderBy: { startedAt: 'asc' },
          },
          fileChanges: {
            select: {
              filePath: true,
              operation: true,
            },
          },
        },
        orderBy: { turnNumber: 'asc' },
      },
      sessionEvents: {
        select: {
          eventType: true,
          eventSubtype: true,
          eventData: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'asc' },
      },
    },
  });

  if (!session) return null;

  // Use actual turns record count instead of metadata turnCount
  const actualTurnCount = session.turns.length;

  return {
    ...session,
    turnCount: actualTurnCount,
    summary: session.summary,
  };
}

// ─── 9. getHeatmapData ─────────────────────────────────────────────────────

export async function getHeatmapData(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  const sql = `
    SELECT
      (DAYOFWEEK(s.started_at) - 1) as dayOfWeek,
      HOUR(s.started_at) as hour,
      CAST(COUNT(*) AS DOUBLE) as count,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY dayOfWeek, hour
    ORDER BY dayOfWeek, hour
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    dayOfWeek: Number(row.dayOfWeek),
    hour: Number(row.hour),
    count: Number(row.count),
    totalTokens: Number(row.totalTokens),
  }));
}

// ─── 10. getSecurityStats ───────────────────────────────────────────────────

export async function getSecurityStats(filters: DashboardFilters) {
  const where = buildSessionWhere(filters);
  const eventWhere: any = { session: where };

  const [
    bypassPermissionSessions,
    permissionRequestCount,
    externalUrlCount,
    abnormalEndCount,
    bashCommandCount,
    permissionModeRaw,
  ] = await Promise.all([
    // Sessions where permissionMode indicates bypass (e.g., 'dangerously_skip_permissions')
    prisma.session.count({
      where: { ...where, permissionMode: 'dangerously_skip_permissions' },
    }),
    // Count of permission_request events
    prisma.sessionEvent.count({
      where: { ...eventWhere, eventType: 'permission_request' },
    }),
    // Count of external URL references (tool uses with web tools)
    prisma.toolUse.count({
      where: { ...{ session: where }, toolCategory: 'web' },
    }),
    // Sessions with abnormal end reasons
    prisma.session.count({
      where: {
        ...where,
        endReason: { not: null, notIn: ['user_exit', 'conversation_end'] },
      },
    }),
    // Count of bash tool uses
    prisma.toolUse.count({
      where: { ...{ session: where }, toolName: 'Bash' },
    }),
    // Permission mode distribution
    prisma.session.groupBy({
      by: ['permissionMode'],
      where,
      _count: { id: true },
    }),
  ]);

  const permissionModeDistribution = permissionModeRaw.map(row => ({
    mode: row.permissionMode ?? 'unknown',
    count: row._count.id,
  }));

  return {
    bypassPermissionSessions,
    permissionRequestCount,
    externalUrlCount,
    abnormalEndCount,
    bashCommandCount,
    permissionModeDistribution,
  };
}

// ─── 11. getRepoStats ───────────────────────────────────────────────────────

export async function getRepoStats(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  const sql = `
    SELECT
      s.git_repo as gitRepo,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as totalCacheReadTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0) AS DOUBLE) as estimatedCost,
      CAST(COUNT(DISTINCT s.member_id) AS DOUBLE) as memberCount,
      MAX(s.started_at) as lastUsed
    FROM sessions s
    ${joinClause}
    ${whereClause}
    ${whereClause ? 'AND' : 'WHERE'} s.git_repo IS NOT NULL
    GROUP BY s.git_repo
    ORDER BY sessionCount DESC
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    gitRepo: row.gitRepo,
    sessionCount: Number(row.sessionCount),
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    totalCacheReadTokens: Number(row.totalCacheReadTokens),
    estimatedCost: Number(row.estimatedCost),
    memberCount: Number(row.memberCount),
    lastUsed: row.lastUsed ? new Date(row.lastUsed).toISOString() : null,
  }));
}

// ─── 12. getRepoDetail ──────────────────────────────────────────────────────

export async function getRepoDetail(repo: string, filters: DashboardFilters) {
  const baseFilters = { ...filters, repo };
  const { whereClause, params } = buildRawWhere(baseFilters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  // Branches
  const branchSql = `
    SELECT
      s.git_branch as gitBranch,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as totalOutputTokens
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY s.git_branch
    ORDER BY sessionCount DESC
  `;

  // Members for this repo (always need member join)
  const memberParams: any[] = [];
  const memberConditions: string[] = [];

  if (filters.from) {
    memberConditions.push('s.started_at >= ?');
    memberParams.push(new Date(filters.from));
  }
  if (filters.to) {
    memberConditions.push('s.started_at <= ?');
    memberParams.push(new Date(filters.to + 'T23:59:59Z'));
  }
  memberConditions.push('s.git_repo = ?');
  memberParams.push(repo);
  if (filters.member) {
    memberConditions.push('m.git_email = ?');
    memberParams.push(filters.member);
  }

  const memberWhereClause = memberConditions.length > 0
    ? 'WHERE ' + memberConditions.join(' AND ')
    : '';

  const memberSql = `
    SELECT
      m.git_email as gitEmail,
      m.display_name as displayName,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${memberWhereClause}
    GROUP BY s.member_id
    ORDER BY sessionCount DESC
  `;

  // Daily stats for this repo
  const dailySql = `
    SELECT
      DATE(s.started_at) as date,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.turn_count), 0) AS DOUBLE) as turnCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY DATE(s.started_at)
    ORDER BY DATE(s.started_at)
  `;

  const where = buildSessionWhere(baseFilters);

  // Frequent files for this repo
  const frequentFilesSql = `
    SELECT
      fc.file_path as filePath,
      CAST(COUNT(*) AS DOUBLE) as changeCount,
      MAX(fc.created_at) as lastChanged
    FROM file_changes fc
    INNER JOIN sessions s ON fc.session_id = s.id
    ${needsMemberJoin ? 'LEFT JOIN members m ON s.member_id = m.id' : ''}
    ${whereClause}
    GROUP BY fc.file_path
    ORDER BY changeCount DESC
    LIMIT 20
  `;

  // Sessions per branch (with turn count & file change count)
  const branchSessionsSql = `
    SELECT
      s.id,
      s.session_uuid as sessionUuid,
      s.git_branch as gitBranch,
      m.git_email as gitEmail,
      m.display_name as displayName,
      s.started_at as startedAt,
      s.summary,
      CAST((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id) AS DOUBLE) as turnCount,
      CAST((SELECT COUNT(*) FROM file_changes fc WHERE fc.session_id = s.id) AS DOUBLE) as fileChangeCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    ORDER BY s.git_branch, s.started_at DESC
  `;

  const [branchRows, memberRows, dailyRows, recentSessions, frequentFileRows, branchSessionRows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(branchSql, ...params),
    prisma.$queryRawUnsafe<any[]>(memberSql, ...memberParams),
    prisma.$queryRawUnsafe<any[]>(dailySql, ...params),
    prisma.session.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        member: {
          select: { gitEmail: true, displayName: true },
        },
      },
    }),
    prisma.$queryRawUnsafe<any[]>(frequentFilesSql, ...params),
    prisma.$queryRawUnsafe<any[]>(branchSessionsSql, ...params),
  ]);

  // Group sessions by branch
  const sessionsByBranch = new Map<string, any[]>();
  for (const row of branchSessionRows) {
    const key = row.gitBranch ?? '';
    if (!sessionsByBranch.has(key)) sessionsByBranch.set(key, []);
    sessionsByBranch.get(key)!.push({
      id: row.id,
      sessionUuid: row.sessionUuid,
      gitEmail: row.gitEmail ?? 'unknown',
      displayName: row.displayName ?? null,
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
      summary: row.summary ?? null,
      turnCount: Number(row.turnCount),
      fileChangeCount: Number(row.fileChangeCount),
    });
  }

  return {
    dailyStats: dailyRows.map(row => ({
      date: row.date,
      sessionCount: Number(row.sessionCount),
      turnCount: Number(row.turnCount),
      totalTokens: Number(row.totalTokens),
    })),
    branches: branchRows.map(row => ({
      gitBranch: row.gitBranch,
      sessionCount: Number(row.sessionCount),
      totalInputTokens: Number(row.totalInputTokens),
      totalOutputTokens: Number(row.totalOutputTokens),
      sessions: sessionsByBranch.get(row.gitBranch ?? '') ?? [],
    })),
    members: memberRows.map(row => ({
      gitEmail: row.gitEmail ?? 'unknown',
      displayName: row.displayName ?? null,
      sessionCount: Number(row.sessionCount),
      totalTokens: Number(row.totalTokens),
    })),
    recentSessions,
    frequentFiles: frequentFileRows.map(row => ({
      filePath: row.filePath,
      changeCount: Number(row.changeCount),
      lastChanged: row.lastChanged ? new Date(row.lastChanged).toISOString() : null,
    })),
  };
}

// ─── 13. getMemberDetail ────────────────────────────────────────────────────

export async function getMemberDetail(member: string, filters: DashboardFilters) {
  const baseFilters = { ...filters, member };
  const { whereClause, params } = buildRawWhere(baseFilters);

  // Daily stats
  const dailySql = `
    SELECT
      DATE(s.started_at) as date,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as inputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as outputTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY DATE(s.started_at)
    ORDER BY DATE(s.started_at)
  `;

  // Model breakdown
  const modelSql = `
    SELECT
      s.model,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY s.model
    ORDER BY sessionCount DESC
  `;

  const where = buildSessionWhere(baseFilters);

  // Exclude empty/stub sessions (0 tokens AND no summary)
  const nonStubWhere = {
    ...where,
    NOT: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      summary: null,
    },
  };

  const [dailyRows, modelRows, recentSessions] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(dailySql, ...params),
    prisma.$queryRawUnsafe<any[]>(modelSql, ...params),
    prisma.session.findMany({
      where: nonStubWhere,
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        member: {
          select: { gitEmail: true, displayName: true },
        },
      },
    }),
  ]);

  return {
    dailyStats: dailyRows.map(row => ({
      date: row.date,
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      sessionCount: Number(row.sessionCount),
    })),
    modelBreakdown: modelRows.map(row => ({
      model: row.model ?? 'unknown',
      sessionCount: Number(row.sessionCount),
      totalTokens: Number(row.totalTokens),
    })),
    recentSessions,
  };
}

// ─── 14. getFilterOptions ───────────────────────────────────────────────────

export async function getFilterOptions() {
  const [members, repos, models] = await Promise.all([
    prisma.member.findMany({
      select: { gitEmail: true, displayName: true },
      orderBy: { gitEmail: 'asc' },
    }),
    prisma.session.findMany({
      where: { gitRepo: { not: null } },
      select: { gitRepo: true },
      distinct: ['gitRepo'],
      orderBy: { gitRepo: 'asc' },
    }),
    prisma.session.findMany({
      where: { model: { not: null } },
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    }),
  ]);

  return {
    members: members.map(m => ({
      gitEmail: m.gitEmail,
      displayName: m.displayName,
    })),
    repos: repos.map(r => r.gitRepo!).filter(Boolean),
    models: models.map(m => m.model!).filter(Boolean),
  };
}

// ─── 15. getRepoDateHeatmap ─────────────────────────────────────────────────

export async function getRepoDateHeatmap(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  const sql = `
    SELECT
      s.git_repo as gitRepo,
      DATE(s.started_at) as date,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.turn_count), 0) AS DOUBLE) as turnCount,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    ${whereClause ? 'AND' : 'WHERE'} s.git_repo IS NOT NULL
    GROUP BY s.git_repo, DATE(s.started_at)
    ORDER BY s.git_repo, DATE(s.started_at)
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    gitRepo: row.gitRepo,
    date: row.date,
    totalTokens: Number(row.totalTokens),
    sessionCount: Number(row.sessionCount),
    turnCount: Number(row.turnCount),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
  }));
}

// ─── 16. getMemberDateHeatmap ───────────────────────────────────────────────

export async function getMemberDateHeatmap(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const sql = `
    SELECT
      m.display_name as displayName,
      m.git_email as gitEmail,
      DATE(s.started_at) as date,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.turn_count), 0) AS DOUBLE) as turnCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY s.member_id, DATE(s.started_at)
    ORDER BY m.display_name, DATE(s.started_at)
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    displayName: row.displayName ?? row.gitEmail ?? 'unknown',
    gitEmail: row.gitEmail ?? 'unknown',
    date: row.date,
    totalTokens: Number(row.totalTokens),
    sessionCount: Number(row.sessionCount),
    turnCount: Number(row.turnCount),
  }));
}

// ─── 17. getProductivityMetrics ─────────────────────────────────────────────

export async function getProductivityMetrics(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const sql = `
    SELECT
      m.display_name as displayName,
      m.git_email as gitEmail,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.turn_count), 0) AS DOUBLE) as totalTurns,
      CAST(COALESCE(SUM(s.tool_use_count), 0) AS DOUBLE) as totalToolUses,
      CAST(COALESCE(SUM(s.subagent_count), 0) AS DOUBLE) as totalSubagents,
      CAST(COALESCE(SUM(s.error_count), 0) AS DOUBLE) as totalErrors,
      CAST(COALESCE(SUM(s.total_input_tokens + s.total_output_tokens), 0) AS DOUBLE) as totalTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as totalCost,
      CAST(COALESCE(AVG(s.turn_count), 0) AS DOUBLE) as avgTurns,
      CAST(COALESCE(AVG(s.tool_use_count), 0) AS DOUBLE) as avgToolUses
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY s.member_id
    ORDER BY totalCost DESC
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    displayName: row.displayName ?? row.gitEmail ?? 'unknown',
    gitEmail: row.gitEmail ?? 'unknown',
    sessionCount: Number(row.sessionCount),
    totalTurns: Number(row.totalTurns),
    totalToolUses: Number(row.totalToolUses),
    totalSubagents: Number(row.totalSubagents),
    totalErrors: Number(row.totalErrors),
    totalTokens: Number(row.totalTokens),
    totalCost: Math.round(Number(row.totalCost) * 10000) / 10000,
    avgTurns: Math.round(Number(row.avgTurns) * 10) / 10,
    avgToolUses: Math.round(Number(row.avgToolUses) * 10) / 10,
    tokensPerSession: Number(row.sessionCount) > 0
      ? Math.round(Number(row.totalTokens) / Number(row.sessionCount))
      : 0,
    costPerSession: Number(row.sessionCount) > 0
      ? Math.round((Number(row.totalCost) / Number(row.sessionCount)) * 10000) / 10000
      : 0,
    errorRate: Number(row.totalToolUses) > 0
      ? Math.round((Number(row.totalErrors) / Number(row.totalToolUses)) * 10000) / 100
      : 0,
  }));
}

// ─── 18. getPromptFeed ──────────────────────────────────────────────────────

export async function getPromptFeed(
  filters: DashboardFilters,
  limit = 50,
  before?: string
) {
  const safeLimit = Math.min(Math.max(1, limit), 200);

  const turnWhere: any = {
    promptText: { not: null },
    promptSubmittedAt: { not: null },
  };

  if (before) {
    turnWhere.promptSubmittedAt = {
      ...turnWhere.promptSubmittedAt,
      lt: new Date(before),
    };
  }

  const sessionWhere: any = {};
  if (filters.from) {
    sessionWhere.startedAt = { ...(sessionWhere.startedAt || {}), gte: new Date(filters.from) };
  }
  if (filters.to) {
    sessionWhere.startedAt = { ...(sessionWhere.startedAt || {}), lte: new Date(filters.to + 'T23:59:59Z') };
  }
  if (filters.member) {
    sessionWhere.member = { gitEmail: filters.member };
  }
  if (filters.repo) {
    sessionWhere.gitRepo = filters.repo;
  }
  if (filters.model) {
    sessionWhere.model = filters.model;
  }

  if (Object.keys(sessionWhere).length > 0) {
    turnWhere.session = sessionWhere;
  }

  const turns = await prisma.turn.findMany({
    where: turnWhere,
    orderBy: { promptSubmittedAt: 'desc' },
    take: safeLimit + 1,
    select: {
      id: true,
      turnNumber: true,
      promptText: true,
      promptSubmittedAt: true,
      durationMs: true,
      inputTokens: true,
      outputTokens: true,
      model: true,
      session: {
        select: {
          id: true,
          gitRepo: true,
          gitBranch: true,
          summary: true,
          model: true,
          member: {
            select: {
              gitEmail: true,
              displayName: true,
            },
          },
        },
      },
      _count: {
        select: { toolUses: true },
      },
    },
  });

  const hasMore = turns.length > safeLimit;
  const data = turns.slice(0, safeLimit);

  return {
    data: data.map(t => ({
      id: t.id,
      turnNumber: t.turnNumber,
      promptText: t.promptText,
      promptSubmittedAt: t.promptSubmittedAt?.toISOString() ?? null,
      durationMs: t.durationMs,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      model: t.model ?? t.session.model,
      member: t.session.member
        ? {
            gitEmail: t.session.member.gitEmail,
            displayName: t.session.member.displayName,
          }
        : null,
      session: {
        id: t.session.id,
        gitRepo: t.session.gitRepo,
        gitBranch: t.session.gitBranch,
        summary: t.session.summary,
      },
      toolCount: t._count.toolUses,
    })),
    hasMore,
  };
}
