import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import {
  getPricing,
  getAllModels as repoGetAllModels,
  upsertPricing as repoUpsertPricing,
  deleteOverride as repoDeleteOverride,
  type ModelPricingRecord,
} from './pricingRepository';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Application timezone for date / hour / day-of-week aggregation in raw SQL.
 *
 * MariaDB stores `DATETIME` values without TZ metadata; the project writes
 * them in UTC (Prisma serializes JS `Date` to ISO UTC). Aggregations like
 * `DATE(s.started_at)` therefore bucket rows by UTC day, which means JST
 * 23:00–24:00 work shows up "yesterday" on the dashboard. We fix this by
 * wrapping every datetime column in `CONVERT_TZ(col, '+00:00', :tz)` before
 * applying `DATE` / `HOUR` / `DAYOFWEEK`.
 *
 * Source-of-truth for the offset is the `APP_TIMEZONE` env var (default
 * `+09:00` for the Tokyo team). It is *not* user input — it is set once at
 * process start by ops, so it is safe to interpolate into SQL. `tzExpr` /
 * `tzDate` are private helpers and are never called with attacker-controlled
 * input.
 *
 * Spec: docs/draft/009-timezone-aggregation.md (case A)
 */
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? '+09:00';

/**
 * SQL expression: a datetime column converted from UTC into APP_TIMEZONE.
 *
 * Exported for unit testing only — runtime callers should keep using it
 * inside this module. The returned string is meant to be inlined directly
 * into a `$queryRawUnsafe` SQL string.
 */
export function tzExpr(col: string): string {
  return `CONVERT_TZ(${col}, '+00:00', '${APP_TIMEZONE}')`;
}

/** SQL expression: the date (YYYY-MM-DD) of `col` in APP_TIMEZONE. */
export function tzDate(col: string): string {
  return `DATE(${tzExpr(col)})`;
}

/** Internal accessor used by tests to verify env wiring. */
export function getAppTimezone(): string {
  return APP_TIMEZONE;
}

/** Convert DATE column (returned as Date object by Prisma) to YYYY-MM-DD string */
function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.slice(0, 10);
  return String(v);
}

/**
 * Compute cache hit ratio (a.k.a. "cacheEfficiency" KPI).
 *
 * Definition: cache_read / (input + cache_creation + cache_read).
 *
 * This is the share of total input-side tokens that were served from the
 * Anthropic prompt cache instead of being billed at the standard input rate.
 * The result is guaranteed to satisfy `0 <= ratio <= 1` because the numerator
 * is one of the addends in the denominator (assuming non-negative inputs).
 *
 * Returns 0 when the denominator is 0 (no input-side tokens recorded yet) to
 * avoid divide-by-zero NaN propagation in downstream rounding.
 *
 * Spec: docs/specs/004-phase1-remaining-bugs.md (bug #12)
 */
export function computeCacheEfficiency(
  inputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
): number {
  // Defensive: clamp negatives to 0 so a malformed row cannot produce a
  // ratio outside [0, 1] and we never feed NaN into the rounding step.
  const input = Math.max(0, inputTokens || 0);
  const cacheCreation = Math.max(0, cacheCreationTokens || 0);
  const cacheRead = Math.max(0, cacheReadTokens || 0);

  const denominator = input + cacheCreation + cacheRead;
  if (denominator <= 0) return 0;
  return cacheRead / denominator;
}

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string;   // ISO date string (YYYY-MM-DD)
  to?: string;     // ISO date string (YYYY-MM-DD)
  member?: string; // git_email (primary member identifier)
  repo?: string;   // git_repo
  model?: string;  // model name
}

// ─── Where-clause Builder ───────────────────────────────────────────────────

function buildSessionWhere(filters: DashboardFilters) {
  const where: any = {
    // Exclude sessions with 0 turns (stubs, incomplete)
    turns: { some: {} },
  };
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
  // Always exclude sessions with 0 turns
  const conditions: string[] = [
    `(SELECT COUNT(*) FROM turns t WHERE t.session_id = ${tableAlias}.id) > 0`,
  ];
  const params: any[] = [];

  if (filters.from) {
    // Compare in APP_TIMEZONE so a JST date string (YYYY-MM-DD) means
    // "00:00 JST that day", which corresponds to 15:00 UTC the previous
    // day. CONVERT_TZ on the LHS lets us pass the bare date string as-is.
    conditions.push(`${tzExpr(`${tableAlias}.started_at`)} >= ?`);
    params.push(filters.from);
  }
  if (filters.to) {
    // Inclusive upper bound: "<= 'YYYY-MM-DD 23:59:59'" in APP_TIMEZONE.
    conditions.push(`${tzExpr(`${tableAlias}.started_at`)} <= ?`);
    params.push(filters.to + ' 23:59:59');
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

  const whereClause = 'WHERE ' + conditions.join(' AND ');
  return { whereClause, params };
}

// ─── Pure aggregation helpers (extracted for unit testing) ─────────────────

/**
 * Shape of the `_sum` payload returned by Prisma's `session.aggregate`
 * when both main agent (`total_*`) and subagent (`subagent_*`) columns are
 * requested. All fields are nullable because `_sum` is null when no rows
 * match the where clause.
 *
 * Spec: docs/specs/004-phase1-remaining-bugs.md (bug #4)
 *       docs/tasks/phase-1.5-t5.md
 */
export interface SessionSplitSums {
  totalInputTokens?: number | null;
  totalOutputTokens?: number | null;
  totalCacheCreationTokens?: number | null;
  totalCacheReadTokens?: number | null;
  estimatedCost?: number | null;
  subagentInputTokens?: number | null;
  subagentOutputTokens?: number | null;
  subagentCacheCreationTokens?: number | null;
  subagentCacheReadTokens?: number | null;
  subagentEstimatedCost?: number | null;
}

export interface SessionGrandTotals {
  // Grand totals (main + subagent) — preserved under the historical key
  // names so existing UIs continue to work.
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  totalCost: number;
  // Main-only breakdown
  mainInputTokens: number;
  mainOutputTokens: number;
  mainCacheCreationTokens: number;
  mainCacheReadTokens: number;
  mainCost: number;
  // Subagent-only breakdown
  subagentInputTokens: number;
  subagentOutputTokens: number;
  subagentCacheCreationTokens: number;
  subagentCacheReadTokens: number;
  subagentCost: number;
}

/**
 * Combine the `_sum` slice of a Prisma session aggregate into the three-tier
 * (main / subagent / grand total) breakdown used by every dashboard endpoint.
 *
 * Bug #4 fix (spec 004): the `total_*` columns now hold MAIN AGENT values
 * only, and `subagent_*` columns hold the subagent slice. Grand total is
 * `main + subagent`, computed at the read site by this helper.
 *
 * The function is pure and tolerant of nulls (Prisma returns null sums when
 * there are no rows matching the where clause).
 */
export function computeSessionGrandTotals(sums: SessionSplitSums): SessionGrandTotals {
  const mainInputTokens = sums.totalInputTokens ?? 0;
  const mainOutputTokens = sums.totalOutputTokens ?? 0;
  const mainCacheCreationTokens = sums.totalCacheCreationTokens ?? 0;
  const mainCacheReadTokens = sums.totalCacheReadTokens ?? 0;
  const mainCost = sums.estimatedCost ?? 0;

  const subagentInputTokens = sums.subagentInputTokens ?? 0;
  const subagentOutputTokens = sums.subagentOutputTokens ?? 0;
  const subagentCacheCreationTokens = sums.subagentCacheCreationTokens ?? 0;
  const subagentCacheReadTokens = sums.subagentCacheReadTokens ?? 0;
  const subagentCost = sums.subagentEstimatedCost ?? 0;

  return {
    totalInputTokens: mainInputTokens + subagentInputTokens,
    totalOutputTokens: mainOutputTokens + subagentOutputTokens,
    totalCacheCreationTokens: mainCacheCreationTokens + subagentCacheCreationTokens,
    totalCacheReadTokens: mainCacheReadTokens + subagentCacheReadTokens,
    totalCost: mainCost + subagentCost,
    mainInputTokens,
    mainOutputTokens,
    mainCacheCreationTokens,
    mainCacheReadTokens,
    mainCost,
    subagentInputTokens,
    subagentOutputTokens,
    subagentCacheCreationTokens,
    subagentCacheReadTokens,
    subagentCost,
  };
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
    // Bug #4 (spec 004 / P1.5-T5): pull both main agent (`total_*`) and
    // subagent (`subagent_*`) sums in a single aggregate. Grand total is
    // computed on the read side as `total_* + subagent_*`. The historical
    // `totalInputTokens` API key is kept but now means GRAND TOTAL so that
    // existing UI continues to display the unified value.
    prisma.session.aggregate({
      where: nonStubWhere,
      _count: { id: true },
      _sum: {
        totalInputTokens: true,
        totalOutputTokens: true,
        totalCacheCreationTokens: true,
        totalCacheReadTokens: true,
        estimatedCost: true,
        subagentInputTokens: true,
        subagentOutputTokens: true,
        subagentCacheCreationTokens: true,
        subagentCacheReadTokens: true,
        subagentEstimatedCost: true,
        subagentCount: true,
        toolUseCount: true,
        errorCount: true,
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
  const grand = computeSessionGrandTotals(sessionAgg._sum);

  // Bug #12 (spec 004): use cache_hit_ratio definition so the value cannot
  // exceed 1 (prior implementation divided by `totalInputTokens` only,
  // producing >100% values regularly). All inputs are GRAND TOTALS so the
  // KPI reflects the full main + subagent activity.
  const cacheEfficiency = computeCacheEfficiency(
    grand.totalInputTokens,
    grand.totalCacheCreationTokens,
    grand.totalCacheReadTokens,
  );

  const averageCostPerSession = totalSessions > 0
    ? grand.totalCost / totalSessions
    : 0;

  return {
    totalSessions,
    // ─── Grand totals (main + subagent) — kept under the original keys ────
    totalInputTokens: grand.totalInputTokens,
    totalOutputTokens: grand.totalOutputTokens,
    totalCacheReadTokens: grand.totalCacheReadTokens,
    totalCacheCreationTokens: grand.totalCacheCreationTokens,
    totalCost: grand.totalCost,
    // ─── Main-only breakdown ──────────────────────────────────────────────
    mainInputTokens: grand.mainInputTokens,
    mainOutputTokens: grand.mainOutputTokens,
    mainCacheCreationTokens: grand.mainCacheCreationTokens,
    mainCacheReadTokens: grand.mainCacheReadTokens,
    mainCost: grand.mainCost,
    // ─── Subagent-only breakdown ──────────────────────────────────────────
    subagentInputTokens: grand.subagentInputTokens,
    subagentOutputTokens: grand.subagentOutputTokens,
    subagentCacheCreationTokens: grand.subagentCacheCreationTokens,
    subagentCacheReadTokens: grand.subagentCacheReadTokens,
    subagentCost: grand.subagentCost,
    // ─── Other KPIs ───────────────────────────────────────────────────────
    activeMembers: activeMembers.filter(m => m.memberId !== null).length,
    totalTurns: turnAgg,
    totalSubagents: subagentAgg._count.id,
    totalToolUses: toolUseAgg._count.id,
    errorCount: sessionAgg._sum.errorCount ?? 0,
    repoCount: repoCount.length,
    averageTurnsPerSession: totalSessions > 0
      ? Math.round((turnAgg / totalSessions) * 100) / 100
      : 0,
    averageCostPerSession: Math.round(averageCostPerSession * 10000) / 10000,
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

  // Bug #4 (spec 004 / P1.5-T5): emit main / subagent / grand-total triplets
  // per day. The historical `totalInputTokens` etc. keys keep their meaning
  // by switching to GRAND totals so charts render the unified value.
  const sql = `
    SELECT
      ${tzDate('s.started_at')} as date,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as mainInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as mainOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as mainCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as mainCacheReadTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as mainCost,
      CAST(COALESCE(SUM(s.subagent_input_tokens), 0) AS DOUBLE) as subagentInputTokens,
      CAST(COALESCE(SUM(s.subagent_output_tokens), 0) AS DOUBLE) as subagentOutputTokens,
      CAST(COALESCE(SUM(s.subagent_cache_creation_tokens), 0) AS DOUBLE) as subagentCacheCreationTokens,
      CAST(COALESCE(SUM(s.subagent_cache_read_tokens), 0) AS DOUBLE) as subagentCacheReadTokens,
      CAST(COALESCE(SUM(s.subagent_estimated_cost), 0.0) AS DOUBLE) as subagentCost,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as totalCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as totalCacheReadTokens,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY ${tzDate('s.started_at')}
    ORDER BY ${tzDate('s.started_at')}
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    date: toDateStr(row.date),
    sessionCount: Number(row.sessionCount),
    // Grand totals (kept under historical keys for backward compat)
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    totalCacheCreationTokens: Number(row.totalCacheCreationTokens),
    totalCacheReadTokens: Number(row.totalCacheReadTokens),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
    // Main-only breakdown
    mainInputTokens: Number(row.mainInputTokens),
    mainOutputTokens: Number(row.mainOutputTokens),
    mainCacheCreationTokens: Number(row.mainCacheCreationTokens),
    mainCacheReadTokens: Number(row.mainCacheReadTokens),
    mainCost: Math.round(Number(row.mainCost) * 10000) / 10000,
    // Subagent-only breakdown
    subagentInputTokens: Number(row.subagentInputTokens),
    subagentOutputTokens: Number(row.subagentOutputTokens),
    subagentCacheCreationTokens: Number(row.subagentCacheCreationTokens),
    subagentCacheReadTokens: Number(row.subagentCacheReadTokens),
    subagentCost: Math.round(Number(row.subagentCost) * 10000) / 10000,
  }));
}

// ─── 3. getMemberStats ──────────────────────────────────────────────────────

export async function getMemberStats(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  // Always join members for grouping
  const joinClause = 'LEFT JOIN members m ON s.member_id = m.id';

  // Bug #4 (spec 004 / P1.5-T5): grand total = main + subagent. Keys
  // `totalInputTokens` etc. now mean GRAND totals to preserve UI semantics.
  const sql = `
    SELECT
      m.git_email as gitEmail,
      m.display_name as displayName,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as totalCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as totalCacheReadTokens,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0.0) AS DOUBLE) as estimatedCost,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as mainInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as mainOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as mainCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as mainCacheReadTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as mainCost,
      CAST(COALESCE(SUM(s.subagent_input_tokens), 0) AS DOUBLE) as subagentInputTokens,
      CAST(COALESCE(SUM(s.subagent_output_tokens), 0) AS DOUBLE) as subagentOutputTokens,
      CAST(COALESCE(SUM(s.subagent_cache_creation_tokens), 0) AS DOUBLE) as subagentCacheCreationTokens,
      CAST(COALESCE(SUM(s.subagent_cache_read_tokens), 0) AS DOUBLE) as subagentCacheReadTokens,
      CAST(COALESCE(SUM(s.subagent_estimated_cost), 0.0) AS DOUBLE) as subagentCost,
      CAST(COALESCE(SUM((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as totalTurns
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
    // Grand totals (main + subagent)
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    totalCacheCreationTokens: Number(row.totalCacheCreationTokens),
    totalCacheReadTokens: Number(row.totalCacheReadTokens),
    totalTokens: Number(row.totalTokens),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
    // Main-only
    mainInputTokens: Number(row.mainInputTokens),
    mainOutputTokens: Number(row.mainOutputTokens),
    mainCacheCreationTokens: Number(row.mainCacheCreationTokens),
    mainCacheReadTokens: Number(row.mainCacheReadTokens),
    mainCost: Math.round(Number(row.mainCost) * 10000) / 10000,
    // Subagent-only
    subagentInputTokens: Number(row.subagentInputTokens),
    subagentOutputTokens: Number(row.subagentOutputTokens),
    subagentCacheCreationTokens: Number(row.subagentCacheCreationTokens),
    subagentCacheReadTokens: Number(row.subagentCacheReadTokens),
    subagentCost: Math.round(Number(row.subagentCost) * 10000) / 10000,
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
      cacheCreationTokens: true,
      cacheReadTokens: true,
      estimatedCost: true,
    },
  });

  const byType = subagents.map(s => ({
    agentType: s.agentType,
    count: s._count.id,
    avgDuration: Math.round((s._avg.durationSeconds ?? 0) * 100) / 100,
    totalTokens: (s._sum.inputTokens ?? 0) + (s._sum.outputTokens ?? 0)
      + (s._sum.cacheCreationTokens ?? 0) + (s._sum.cacheReadTokens ?? 0),
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

  // Bug #4 (spec 004 / P1.5-T5): aggregate grand totals (main + subagent)
  // when computing token-based fallback cost, and combine the two stored
  // cost columns. Keys `inputTokens`, `cost` etc. retain their semantics
  // by switching to GRAND values.
  const sql = `
    SELECT
      ${tzDate('s.started_at')} as date,
      s.model,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as inputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as outputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as cacheCreation,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as cacheRead,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY ${tzDate('s.started_at')}, s.model
    ORDER BY ${tzDate('s.started_at')}
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return Promise.all(
    rows.map(async (row) => {
      // If estimatedCost is already stored, prefer it; otherwise compute from tokens
      let cost = Number(row.estimatedCost);
      if (cost === 0) {
        // Pass the per-row usage so getPricing can pick the `-context-1m`
        // premium tier when total input tokens exceed the 200K threshold
        // (docs/decisions/resolved.md D-008).
        const rates = await getPricing(row.model ?? '', {
          inputTokens: Number(row.inputTokens),
          cacheCreationTokens: Number(row.cacheCreation),
          cacheReadTokens: Number(row.cacheRead),
          outputTokens: Number(row.outputTokens),
        });
        cost =
          (Number(row.inputTokens) / 1_000_000) * rates.inputPerMtok +
          (Number(row.outputTokens) / 1_000_000) * rates.outputPerMtok +
          (Number(row.cacheCreation) / 1_000_000) * rates.cacheWritePerMtok +
          (Number(row.cacheRead) / 1_000_000) * rates.cacheReadPerMtok;
      }

      return {
        date: toDateStr(row.date),
        model: row.model ?? 'unknown',
        cost: Math.round(cost * 10000) / 10000,
      };
    }),
  );
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
      orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
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
        totalCacheCreationTokens: true,
        totalCacheReadTokens: true,
        estimatedCost: true,
        // Bug #4 (spec 004 / P1.5-T5): expose subagent slice so the
        // session list can render grand total = main + subagent.
        subagentInputTokens: true,
        subagentOutputTokens: true,
        subagentCacheCreationTokens: true,
        subagentCacheReadTokens: true,
        subagentEstimatedCost: true,
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
    data: data.map(s => {
      // Grand totals (kept under historical keys for UI compat)
      const grandInputTokens = (s.totalInputTokens ?? 0) + (s.subagentInputTokens ?? 0);
      const grandOutputTokens = (s.totalOutputTokens ?? 0) + (s.subagentOutputTokens ?? 0);
      const grandCacheCreationTokens =
        (s.totalCacheCreationTokens ?? 0) + (s.subagentCacheCreationTokens ?? 0);
      const grandCacheReadTokens =
        (s.totalCacheReadTokens ?? 0) + (s.subagentCacheReadTokens ?? 0);
      const grandCost = (s.estimatedCost ?? 0) + (s.subagentEstimatedCost ?? 0);

      return {
        ...s,
        // Main-only (renamed copies — preserve raw `total*` columns AS grand total)
        mainInputTokens: s.totalInputTokens,
        mainOutputTokens: s.totalOutputTokens,
        mainCacheCreationTokens: s.totalCacheCreationTokens,
        mainCacheReadTokens: s.totalCacheReadTokens,
        mainCost: s.estimatedCost,
        // Override historical keys to grand totals
        totalInputTokens: grandInputTokens,
        totalOutputTokens: grandOutputTokens,
        totalCacheCreationTokens: grandCacheCreationTokens,
        totalCacheReadTokens: grandCacheReadTokens,
        estimatedCost: grandCost,
        firstPrompt: s.turns?.[0]?.promptText ?? null,
        turnCount: s.turns.length,
        turns: undefined,
        startedAt: s.startedAt?.toISOString() ?? null,
        endedAt: s.endedAt?.toISOString() ?? null,
      };
    }),
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
              promptText: true,
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
                  fileChanges: {
                    select: { filePath: true, operation: true },
                  },
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

  // Fetch ALL file changes for this session (including turn_id=NULL)
  const allFileChanges = await prisma.fileChange.findMany({
    where: { sessionId: id },
    select: { filePath: true, operation: true, turnId: true },
    orderBy: { id: 'asc' },
  });

  // Fetch ALL tool_uses with file operations (turn_id=NULL included)
  const fileToolUses = await prisma.toolUse.findMany({
    where: {
      sessionId: id,
      toolName: { in: ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'] },
    },
    select: { id: true, turnId: true, toolName: true, toolInputSummary: true },
    orderBy: { id: 'asc' },
  });

  // Build turn-level file changes:
  // 1. Use direct turn.fileChanges if available (turn_id linked)
  // 2. Otherwise, infer from session-level tool_uses ordered by ID
  //    (tool_uses without turn_id are distributed to turns by sequence)
  const unlinkedToolUses = fileToolUses.filter(tu => tu.turnId === null);
  let unlinkedIdx = 0;
  const turnCount = session.turns.length;

  // Estimate how many unlinked tool_uses per turn
  // Strategy: distribute evenly, or use tool_use ordering heuristic
  // Since tool_uses and turns are both ordered by sequence, we split
  // unlinked tool_uses proportionally across turns
  const perTurnEstimate = turnCount > 0 ? Math.ceil(unlinkedToolUses.length / turnCount) : 0;

  const enrichedTurns = session.turns.map((turn, tidx) => {
    // Already has turn-level file changes from DB
    if (turn.fileChanges.length > 0) return turn;

    // Also check if turn has linked toolUses
    if (turn.toolUses.length > 0) {
      // Infer from turn's own tool uses
      const inferred: { filePath: string; operation: string }[] = [];
      for (const tu of turn.toolUses) {
        if (/^(Write|Edit|MultiEdit|NotebookEdit)$/i.test(tu.toolName) && tu.toolInputSummary) {
          const fp = tu.toolInputSummary.split(/\s/)[0].trim();
          if (fp) inferred.push({ filePath: fp, operation: tu.toolName.toLowerCase() });
        }
      }
      if (inferred.length > 0) {
        const seen = new Set<string>();
        const unique = inferred.filter(f => {
          const k = `${f.operation}:${f.filePath}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return { ...turn, fileChanges: unique };
      }
    }

    // Assign a slice of unlinked tool_uses to this turn
    const sliceEnd = Math.min(unlinkedIdx + perTurnEstimate, unlinkedToolUses.length);
    const slice = unlinkedToolUses.slice(unlinkedIdx, sliceEnd);
    unlinkedIdx = sliceEnd;

    const inferred: { filePath: string; operation: string }[] = [];
    for (const tu of slice) {
      if (tu.toolInputSummary) {
        const fp = tu.toolInputSummary.split(/\s/)[0].trim();
        if (fp) inferred.push({ filePath: fp, operation: tu.toolName.toLowerCase() });
      }
    }
    const seen = new Set<string>();
    const unique = inferred.filter(f => {
      const k = `${f.operation}:${f.filePath}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return { ...turn, fileChanges: unique };
  });

  // Session-level: unlinked file changes (for summary display)
  const sessionFileChanges = allFileChanges
    .filter(fc => fc.turnId === null)
    .map(fc => ({ filePath: fc.filePath, operation: fc.operation }));

  // Compute durationMs for turns that don't have it stored.
  // Strategy: duration = responseCompletedAt - promptSubmittedAt
  // Fallback: use next turn's promptSubmittedAt or session.endedAt
  const turnsWithDuration = enrichedTurns.map((turn, idx) => {
    if (turn.durationMs != null && turn.durationMs > 0) return turn;
    if (!turn.promptSubmittedAt) return turn;

    const startMs = new Date(turn.promptSubmittedAt).getTime();
    let endMs: number | null = null;

    // Primary: use responseCompletedAt (actual AI response time from transcript)
    if (turn.responseCompletedAt) {
      endMs = new Date(turn.responseCompletedAt).getTime();
    }

    // Fallback: use next turn's promptSubmittedAt
    if (endMs == null) {
      for (let j = idx + 1; j < enrichedTurns.length; j++) {
        if (enrichedTurns[j].promptSubmittedAt) {
          endMs = new Date(enrichedTurns[j].promptSubmittedAt!).getTime();
          break;
        }
      }
    }

    // Last resort: use session endedAt
    if (endMs == null && session.endedAt) {
      endMs = new Date(session.endedAt).getTime();
    }

    if (endMs != null && endMs > startMs) {
      return { ...turn, durationMs: endMs - startMs };
    }
    return turn;
  });

  // Bug #4 (spec 004 / P1.5-T5): expose grand total = main + subagent on
  // the historical keys so detail UIs render the unified value, while
  // preserving the raw split for callers that want it.
  const mainInputTokens = session.totalInputTokens ?? 0;
  const mainOutputTokens = session.totalOutputTokens ?? 0;
  const mainCacheCreationTokens = session.totalCacheCreationTokens ?? 0;
  const mainCacheReadTokens = session.totalCacheReadTokens ?? 0;
  const mainCost = session.estimatedCost ?? 0;
  const subagentInputTokens = session.subagentInputTokens ?? 0;
  const subagentOutputTokens = session.subagentOutputTokens ?? 0;
  const subagentCacheCreationTokens = session.subagentCacheCreationTokens ?? 0;
  const subagentCacheReadTokens = session.subagentCacheReadTokens ?? 0;
  const subagentCost = session.subagentEstimatedCost ?? 0;

  return {
    ...session,
    // Grand totals override historical keys
    totalInputTokens: mainInputTokens + subagentInputTokens,
    totalOutputTokens: mainOutputTokens + subagentOutputTokens,
    totalCacheCreationTokens: mainCacheCreationTokens + subagentCacheCreationTokens,
    totalCacheReadTokens: mainCacheReadTokens + subagentCacheReadTokens,
    estimatedCost: mainCost + subagentCost,
    // Main-only breakdown
    mainInputTokens,
    mainOutputTokens,
    mainCacheCreationTokens,
    mainCacheReadTokens,
    mainCost,
    // Subagent-only breakdown (raw columns also still present via spread above)
    turns: turnsWithDuration,
    turnCount: actualTurnCount,
    summary: session.summary,
    sessionFileChanges,
  };
}

// ─── 9. getHeatmapData ─────────────────────────────────────────────────────

export async function getHeatmapData(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  const needsMemberJoin = !!filters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  // Bug #4 (spec 004 / P1.5-T5): include subagent tokens in the heatmap
  // intensity so dormant cells caused by main-only counting are filled in.
  const sql = `
    SELECT
      (DAYOFWEEK(${tzExpr('s.started_at')}) - 1) as dayOfWeek,
      HOUR(${tzExpr('s.started_at')}) as hour,
      CAST(COUNT(*) AS DOUBLE) as count,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens
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

  // Bug #4 (spec 004 / P1.5-T5): grand totals = main + subagent. Keep the
  // historical `totalInputTokens` etc. keys but switch their meaning to
  // grand totals; expose new `mainXxx` / `subagentXxx` triplets alongside.
  const sql = `
    SELECT
      s.git_repo as gitRepo,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as totalCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as totalCacheReadTokens,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0) AS DOUBLE) as estimatedCost,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as mainInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as mainOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as mainCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as mainCacheReadTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as mainCost,
      CAST(COALESCE(SUM(s.subagent_input_tokens), 0) AS DOUBLE) as subagentInputTokens,
      CAST(COALESCE(SUM(s.subagent_output_tokens), 0) AS DOUBLE) as subagentOutputTokens,
      CAST(COALESCE(SUM(s.subagent_cache_creation_tokens), 0) AS DOUBLE) as subagentCacheCreationTokens,
      CAST(COALESCE(SUM(s.subagent_cache_read_tokens), 0) AS DOUBLE) as subagentCacheReadTokens,
      CAST(COALESCE(SUM(s.subagent_estimated_cost), 0.0) AS DOUBLE) as subagentCost,
      CAST(COUNT(DISTINCT s.member_id) AS DOUBLE) as memberCount,
      MAX(COALESCE(s.ended_at, s.started_at)) as lastUsed
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
    // Grand totals (main + subagent)
    totalInputTokens: Number(row.totalInputTokens),
    totalOutputTokens: Number(row.totalOutputTokens),
    totalCacheCreationTokens: Number(row.totalCacheCreationTokens),
    totalCacheReadTokens: Number(row.totalCacheReadTokens),
    estimatedCost: Number(row.estimatedCost),
    // Main-only
    mainInputTokens: Number(row.mainInputTokens),
    mainOutputTokens: Number(row.mainOutputTokens),
    mainCacheCreationTokens: Number(row.mainCacheCreationTokens),
    mainCacheReadTokens: Number(row.mainCacheReadTokens),
    mainCost: Math.round(Number(row.mainCost) * 10000) / 10000,
    // Subagent-only
    subagentInputTokens: Number(row.subagentInputTokens),
    subagentOutputTokens: Number(row.subagentOutputTokens),
    subagentCacheCreationTokens: Number(row.subagentCacheCreationTokens),
    subagentCacheReadTokens: Number(row.subagentCacheReadTokens),
    subagentCost: Math.round(Number(row.subagentCost) * 10000) / 10000,
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

  // Branches — bug #4 / P1.5-T5: grand totals (main + subagent)
  const branchSql = `
    SELECT
      s.git_branch as gitBranch,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as totalInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as totalOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as totalCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as totalCacheReadTokens,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as mainInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as mainOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as mainCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as mainCacheReadTokens,
      CAST(COALESCE(SUM(s.subagent_input_tokens), 0) AS DOUBLE) as subagentInputTokens,
      CAST(COALESCE(SUM(s.subagent_output_tokens), 0) AS DOUBLE) as subagentOutputTokens,
      CAST(COALESCE(SUM(s.subagent_cache_creation_tokens), 0) AS DOUBLE) as subagentCacheCreationTokens,
      CAST(COALESCE(SUM(s.subagent_cache_read_tokens), 0) AS DOUBLE) as subagentCacheReadTokens
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY s.git_branch
    ORDER BY sessionCount DESC
  `;

  // Members for this repo (always need member join)
  const memberParams: any[] = [];
  const memberConditions: string[] = [
    '(SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id) > 0',
  ];

  if (filters.from) {
    memberConditions.push(`${tzExpr('s.started_at')} >= ?`);
    memberParams.push(filters.from);
  }
  if (filters.to) {
    memberConditions.push(`${tzExpr('s.started_at')} <= ?`);
    memberParams.push(filters.to + ' 23:59:59');
  }
  memberConditions.push('s.git_repo = ?');
  memberParams.push(repo);
  if (filters.member) {
    memberConditions.push('m.git_email = ?');
    memberParams.push(filters.member);
  }

  const memberWhereClause = 'WHERE ' + memberConditions.join(' AND ');

  // Members — bug #4 / P1.5-T5: include subagent slice in totalTokens
  const memberSql = `
    SELECT
      m.git_email as gitEmail,
      m.display_name as displayName,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${memberWhereClause}
    GROUP BY s.member_id
    ORDER BY sessionCount DESC
  `;

  // Daily stats for this repo — bug #4 / P1.5-T5: include subagent slice
  const dailySql = `
    SELECT
      ${tzDate('s.started_at')} as date,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as turnCount,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens
    FROM sessions s
    ${joinClause}
    ${whereClause}
    GROUP BY ${tzDate('s.started_at')}
    ORDER BY ${tzDate('s.started_at')}
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
      s.ended_at as endedAt,
      s.summary,
      CAST((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id) AS DOUBLE) as turnCount,
      CAST((SELECT COUNT(*) FROM file_changes fc WHERE fc.session_id = s.id) AS DOUBLE) as fileChangeCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    ORDER BY s.git_branch, COALESCE(s.ended_at, s.started_at) DESC
  `;

  const [branchRows, memberRows, dailyRows, recentSessions, frequentFileRows, branchSessionRows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(branchSql, ...params),
    prisma.$queryRawUnsafe<any[]>(memberSql, ...memberParams),
    prisma.$queryRawUnsafe<any[]>(dailySql, ...params),
    prisma.session.findMany({
      where,
      orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
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
      endedAt: row.endedAt ? new Date(row.endedAt).toISOString() : null,
      summary: row.summary ?? null,
      turnCount: Number(row.turnCount),
      fileChangeCount: Number(row.fileChangeCount),
    });
  }

  return {
    dailyStats: dailyRows.map(row => ({
      date: toDateStr(row.date),
      sessionCount: Number(row.sessionCount),
      turnCount: Number(row.turnCount),
      totalTokens: Number(row.totalTokens),
    })),
    branches: branchRows.map(row => ({
      gitBranch: row.gitBranch,
      sessionCount: Number(row.sessionCount),
      // Grand totals (main + subagent)
      totalInputTokens: Number(row.totalInputTokens),
      totalOutputTokens: Number(row.totalOutputTokens),
      totalCacheCreationTokens: Number(row.totalCacheCreationTokens),
      totalCacheReadTokens: Number(row.totalCacheReadTokens),
      // Main-only
      mainInputTokens: Number(row.mainInputTokens),
      mainOutputTokens: Number(row.mainOutputTokens),
      mainCacheCreationTokens: Number(row.mainCacheCreationTokens),
      mainCacheReadTokens: Number(row.mainCacheReadTokens),
      // Subagent-only
      subagentInputTokens: Number(row.subagentInputTokens),
      subagentOutputTokens: Number(row.subagentOutputTokens),
      subagentCacheCreationTokens: Number(row.subagentCacheCreationTokens),
      subagentCacheReadTokens: Number(row.subagentCacheReadTokens),
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

  // Daily stats — bug #4 / P1.5-T5: emit grand totals plus the
  // main-only / subagent-only triplets so the UI can show splits.
  const dailySql = `
    SELECT
      ${tzDate('s.started_at')} as date,
      CAST(COALESCE(SUM(s.total_input_tokens + s.subagent_input_tokens), 0) AS DOUBLE) as inputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens + s.subagent_output_tokens), 0) AS DOUBLE) as outputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens + s.subagent_cache_creation_tokens), 0) AS DOUBLE) as cacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens + s.subagent_cache_read_tokens), 0) AS DOUBLE) as cacheReadTokens,
      CAST(COALESCE(SUM(s.total_input_tokens), 0) AS DOUBLE) as mainInputTokens,
      CAST(COALESCE(SUM(s.total_output_tokens), 0) AS DOUBLE) as mainOutputTokens,
      CAST(COALESCE(SUM(s.total_cache_creation_tokens), 0) AS DOUBLE) as mainCacheCreationTokens,
      CAST(COALESCE(SUM(s.total_cache_read_tokens), 0) AS DOUBLE) as mainCacheReadTokens,
      CAST(COALESCE(SUM(s.subagent_input_tokens), 0) AS DOUBLE) as subagentInputTokens,
      CAST(COALESCE(SUM(s.subagent_output_tokens), 0) AS DOUBLE) as subagentOutputTokens,
      CAST(COALESCE(SUM(s.subagent_cache_creation_tokens), 0) AS DOUBLE) as subagentCacheCreationTokens,
      CAST(COALESCE(SUM(s.subagent_cache_read_tokens), 0) AS DOUBLE) as subagentCacheReadTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY ${tzDate('s.started_at')}
    ORDER BY ${tzDate('s.started_at')}
  `;

  // Model breakdown — bug #4 / P1.5-T5: include subagent slice
  const modelSql = `
    SELECT
      s.model,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens
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
      orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
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
      date: toDateStr(row.date),
      // Grand totals (main + subagent)
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      cacheCreationTokens: Number(row.cacheCreationTokens),
      cacheReadTokens: Number(row.cacheReadTokens),
      // Main-only
      mainInputTokens: Number(row.mainInputTokens),
      mainOutputTokens: Number(row.mainOutputTokens),
      mainCacheCreationTokens: Number(row.mainCacheCreationTokens),
      mainCacheReadTokens: Number(row.mainCacheReadTokens),
      // Subagent-only
      subagentInputTokens: Number(row.subagentInputTokens),
      subagentOutputTokens: Number(row.subagentOutputTokens),
      subagentCacheCreationTokens: Number(row.subagentCacheCreationTokens),
      subagentCacheReadTokens: Number(row.subagentCacheReadTokens),
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
      where: { gitRepo: { not: null }, turns: { some: {} } },
      select: { gitRepo: true },
      distinct: ['gitRepo'],
      orderBy: { gitRepo: 'asc' },
    }),
    prisma.session.findMany({
      where: { model: { not: null }, turns: { some: {} } },
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

// ─── Heatmap default window helper ─────────────────────────────────────────

/**
 * Default time window for date-axis heatmaps when the caller did not specify
 * `filters.from`. Without this guard the heatmap renders one column per day
 * for the entire history of the database, which on the dashboard becomes an
 * effectively infinite horizontal scroll. We cap to the last 30 days (JST
 * calendar) so the grid stays readable inside a `grid-2` cell.
 *
 * The cutoff is applied as a parameterized `>=` in JST via `tzExpr`, the same
 * shape used by `buildRawWhere` for explicit `from`. `to` is intentionally
 * untouched: when only `from` is omitted, we still honor an explicit `to`.
 */
const HEATMAP_DEFAULT_DAYS = 30;

function applyHeatmapDateWindow(filters: DashboardFilters): DashboardFilters {
  if (filters.from) return filters;
  // Compute "today (JST) - 30 days" as a YYYY-MM-DD string. We do this in
  // Node so the value is a stable parameter rather than baked into SQL, and
  // so unit tests can stub Date.
  const nowMs = Date.now();
  // JST is UTC+9. Shift the wall clock and slice to date.
  const jstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
  jstNow.setUTCDate(jstNow.getUTCDate() - HEATMAP_DEFAULT_DAYS);
  const from = jstNow.toISOString().slice(0, 10);
  return { ...filters, from };
}

// ─── 15. getRepoDateHeatmap ─────────────────────────────────────────────────

export async function getRepoDateHeatmap(filters: DashboardFilters) {
  const effectiveFilters = applyHeatmapDateWindow(filters);
  const { whereClause, params } = buildRawWhere(effectiveFilters);

  const needsMemberJoin = !!effectiveFilters.member;
  const joinClause = needsMemberJoin
    ? 'LEFT JOIN members m ON s.member_id = m.id'
    : '';

  // Bug #4 (spec 004 / P1.5-T5): grand totals include subagent slice
  // for both totalTokens and estimatedCost.
  const sql = `
    SELECT
      s.git_repo as gitRepo,
      ${tzDate('s.started_at')} as date,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as turnCount,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0.0) AS DOUBLE) as estimatedCost
    FROM sessions s
    ${joinClause}
    ${whereClause}
    ${whereClause ? 'AND' : 'WHERE'} s.git_repo IS NOT NULL
    GROUP BY s.git_repo, ${tzDate('s.started_at')}
    ORDER BY s.git_repo, ${tzDate('s.started_at')}
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    gitRepo: row.gitRepo,
    date: toDateStr(row.date),
    totalTokens: Number(row.totalTokens),
    sessionCount: Number(row.sessionCount),
    turnCount: Number(row.turnCount),
    estimatedCost: Math.round(Number(row.estimatedCost) * 10000) / 10000,
  }));
}

// ─── 16. getMemberDateHeatmap ───────────────────────────────────────────────

export async function getMemberDateHeatmap(filters: DashboardFilters) {
  const effectiveFilters = applyHeatmapDateWindow(filters);
  const { whereClause, params } = buildRawWhere(effectiveFilters);

  // Bug #4 (spec 004 / P1.5-T5): grand-total totalTokens includes subagent slice.
  const sql = `
    SELECT
      m.display_name as displayName,
      m.git_email as gitEmail,
      ${tzDate('s.started_at')} as date,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as turnCount
    FROM sessions s
    LEFT JOIN members m ON s.member_id = m.id
    ${whereClause}
    GROUP BY s.member_id, ${tzDate('s.started_at')}
    ORDER BY m.display_name, ${tzDate('s.started_at')}
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

  return rows.map(row => ({
    displayName: row.displayName ?? row.gitEmail ?? 'unknown',
    gitEmail: row.gitEmail ?? 'unknown',
    date: toDateStr(row.date),
    totalTokens: Number(row.totalTokens),
    sessionCount: Number(row.sessionCount),
    turnCount: Number(row.turnCount),
  }));
}

// ─── 17. getProductivityMetrics ─────────────────────────────────────────────

export async function getProductivityMetrics(filters: DashboardFilters) {
  const { whereClause, params } = buildRawWhere(filters);

  // Bug #4 (spec 004 / P1.5-T5): totalTokens / totalCost are grand totals
  // (main + subagent). main / subagent breakdown is exposed alongside.
  const sql = `
    SELECT
      m.display_name as displayName,
      m.git_email as gitEmail,
      CAST(COUNT(*) AS DOUBLE) as sessionCount,
      CAST(COALESCE(SUM((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as totalTurns,
      CAST(COALESCE(SUM(s.tool_use_count), 0) AS DOUBLE) as totalToolUses,
      CAST(COALESCE(SUM(s.subagent_count), 0) AS DOUBLE) as totalSubagents,
      CAST(COALESCE(SUM(s.error_count), 0) AS DOUBLE) as totalErrors,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
        + s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as totalTokens,
      CAST(COALESCE(SUM(COALESCE(s.estimated_cost, 0) + COALESCE(s.subagent_estimated_cost, 0)), 0.0) AS DOUBLE) as totalCost,
      CAST(COALESCE(SUM(
        s.total_input_tokens + s.total_output_tokens + s.total_cache_creation_tokens + s.total_cache_read_tokens
      ), 0) AS DOUBLE) as mainTokens,
      CAST(COALESCE(SUM(s.estimated_cost), 0.0) AS DOUBLE) as mainCost,
      CAST(COALESCE(SUM(
        s.subagent_input_tokens + s.subagent_output_tokens + s.subagent_cache_creation_tokens + s.subagent_cache_read_tokens
      ), 0) AS DOUBLE) as subagentTokens,
      CAST(COALESCE(SUM(s.subagent_estimated_cost), 0.0) AS DOUBLE) as subagentCost,
      CAST(COALESCE(AVG((SELECT COUNT(*) FROM turns t WHERE t.session_id = s.id)), 0) AS DOUBLE) as avgTurns,
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
    // Grand totals (main + subagent)
    totalTokens: Number(row.totalTokens),
    totalCost: Math.round(Number(row.totalCost) * 10000) / 10000,
    // Main-only / Subagent-only breakdown
    mainTokens: Number(row.mainTokens),
    mainCost: Math.round(Number(row.mainCost) * 10000) / 10000,
    subagentTokens: Number(row.subagentTokens),
    subagentCost: Math.round(Number(row.subagentCost) * 10000) / 10000,
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
  before?: string,
  hours?: number
) {
  const safeLimit = Math.min(Math.max(1, limit), 500);

  const turnWhere: any = {
    promptText: { not: null },
    promptSubmittedAt: { not: null },
  };

  // hours filter: override from/to with recent N hours
  if (hours && hours > 0) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    turnWhere.promptSubmittedAt = {
      ...turnWhere.promptSubmittedAt,
      gte: since,
    };
  }

  if (before) {
    turnWhere.promptSubmittedAt = {
      ...turnWhere.promptSubmittedAt,
      lt: new Date(before),
    };
  }

  const sessionWhere = buildSessionWhere(filters);
  turnWhere.session = sessionWhere;

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
      cacheCreationTokens: true,
      cacheReadTokens: true,
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
      cacheCreationTokens: t.cacheCreationTokens,
      cacheReadTokens: t.cacheReadTokens,
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

// ─── GET /models — Model pricing registry ──────────────────────────────────

/**
 * Returns the model pricing registry as exposed by the `pricingRepository`.
 * Thin wrapper so the route handler does not import the repository directly.
 *
 * Decimal -> number conversion is already performed inside `pricingRepository`,
 * so this function simply forwards the records.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 */
export async function getModels(options?: {
  includeDeprecated?: boolean;
}): Promise<{ models: ModelPricingRecord[] }> {
  const models = await repoGetAllModels({
    includeDeprecated: options?.includeDeprecated ?? false,
  });
  return { models };
}

// ─── POST /models/override — Manual pricing override ───────────────────────

export interface ModelOverrideInput {
  modelId: string;
  family?: string;
  tier?: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
  contextWindow?: number | null;
  notes?: string;
}

/**
 * Validation error thrown when override input fails sanity checks.
 * Route handler maps this to HTTP 400.
 */
export class OverrideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverrideValidationError';
  }
}

function validateNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new OverrideValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function validateNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new OverrideValidationError(`${field} must be a non-negative finite number`);
  }
  return value;
}

/**
 * Upsert a `manual_override` pricing row for the given model.
 * Values written here take priority over litellm-synced rows in `getPricing`.
 *
 * Spec: docs/specs/002-model-pricing-registry.md (admin UI manual override)
 * Task: docs/tasks/phase-2-t11.md
 */
export async function upsertModelOverride(input: ModelOverrideInput): Promise<{
  ok: true;
  modelId: string;
}> {
  const modelId = validateNonEmptyString(input.modelId, 'modelId');
  const family = input.family ? validateNonEmptyString(input.family, 'family') : undefined;
  const tier = input.tier ? validateNonEmptyString(input.tier, 'tier') : undefined;
  const inputPerMtok = validateNonNegativeNumber(input.inputPerMtok, 'inputPerMtok');
  const outputPerMtok = validateNonNegativeNumber(input.outputPerMtok, 'outputPerMtok');
  const cacheWritePerMtok = validateNonNegativeNumber(input.cacheWritePerMtok, 'cacheWritePerMtok');
  const cacheReadPerMtok = validateNonNegativeNumber(input.cacheReadPerMtok, 'cacheReadPerMtok');

  await repoUpsertPricing({
    modelId,
    family,
    tier,
    inputPerMtok,
    outputPerMtok,
    cacheWritePerMtok,
    cacheReadPerMtok,
    contextWindow: input.contextWindow ?? null,
    source: 'manual_override',
    verified: true,
    deprecated: false,
  });

  return { ok: true, modelId };
}

/**
 * Delete the `manual_override` row for a model. No-op when none exists.
 * Returns `{ ok: true, removed: N }` so callers can distinguish 0 / 1.
 *
 * Spec: docs/specs/002-model-pricing-registry.md (admin UI manual override)
 * Task: docs/tasks/phase-2-t11.md
 */
export async function deleteModelOverride(modelId: string): Promise<{
  ok: true;
  modelId: string;
  removed: number;
}> {
  const trimmed = validateNonEmptyString(modelId, 'modelId');
  const removed = await repoDeleteOverride(trimmed);
  return { ok: true, modelId: trimmed, removed };
}
