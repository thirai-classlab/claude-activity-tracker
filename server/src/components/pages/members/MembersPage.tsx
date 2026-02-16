'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { DataTable } from '@/components/shared/DataTable';
import { RankBadge } from '@/components/shared/RankBadge';
import { TokenBreakdown } from '@/components/shared/TokenBreakdown';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { MatrixHeatmap } from '@/components/charts/MatrixHeatmap';
import { useFilters } from '@/hooks/useFilters';
import { useMemberStats, useStats, useMemberDateHeatmap, useProductivityMetrics } from '@/hooks/useApi';
import { formatCost, formatNumber, formatCompact, formatDateShort } from '@/lib/formatters';
import type { MemberStatsItem, MemberDateHeatmapItem, ProductivityMetricsItem } from '@/lib/types';

// ---------------------------------------------------------------------------
// Week-over-week comparison helper
// ---------------------------------------------------------------------------
function computeWeekOverWeek(
  heatmapData: MemberDateHeatmapItem[],
): Record<string, { current: number; previous: number; pct: number; direction: 'up' | 'down' | 'flat' }> {
  const result: Record<string, { current: number; previous: number; pct: number; direction: 'up' | 'down' | 'flat' }> = {};

  // Sort dates to find the latest week boundary
  const allDates = [...new Set(heatmapData.map(d => {
    const s = String(d.date);
    return s.includes('T') ? s.split('T')[0] : s;
  }))].sort();

  if (allDates.length === 0) return result;

  const latest = new Date(allDates[allDates.length - 1]);
  const oneWeekAgo = new Date(latest);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  const twoWeeksAgo = new Date(oneWeekAgo);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const currentStart = fmt(oneWeekAgo);
  const currentEnd = fmt(latest);
  const prevStart = fmt(twoWeeksAgo);
  const prevEnd = fmt(new Date(oneWeekAgo.getTime() - 86400000));

  for (const item of heatmapData) {
    const email = item.gitEmail;
    let dateStr = String(item.date);
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    const tokens = Number(item.totalTokens) || 0;

    if (!result[email]) {
      result[email] = { current: 0, previous: 0, pct: 0, direction: 'flat' };
    }

    if (dateStr >= currentStart && dateStr <= currentEnd) {
      result[email].current += tokens;
    } else if (dateStr >= prevStart && dateStr <= prevEnd) {
      result[email].previous += tokens;
    }
  }

  for (const email of Object.keys(result)) {
    const r = result[email];
    if (r.previous > 0) {
      r.pct = ((r.current - r.previous) / r.previous) * 100;
      r.direction = r.pct > 1 ? 'up' : r.pct < -1 ? 'down' : 'flat';
    } else if (r.current > 0) {
      r.pct = 100;
      r.direction = 'up';
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Compute last activity date per member from heatmap data
// ---------------------------------------------------------------------------
function computeLastActivity(heatmapData: MemberDateHeatmapItem[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of heatmapData) {
    const email = item.gitEmail;
    let dateStr = String(item.date);
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    if (!result[email] || dateStr > result[email]) {
      result[email] = dateStr;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// MembersPage
// ---------------------------------------------------------------------------
export function MembersPage() {
  const router = useRouter();
  const { filters } = useFilters();
  const stats = useStats(filters);
  const members = useMemberStats(filters);
  const heatmap = useMemberDateHeatmap(filters);
  const productivity = useProductivityMetrics(filters);

  const weekComparison = useMemo(
    () => computeWeekOverWeek(heatmap.data || []),
    [heatmap.data],
  );

  const lastActivity = useMemo(
    () => computeLastActivity(heatmap.data || []),
    [heatmap.data],
  );

  // Build a lookup for productivity metrics (avgTurns, errorRate etc.)
  const prodMap = useMemo(() => {
    const m: Record<string, ProductivityMetricsItem> = {};
    for (const p of (productivity.data || [])) {
      m[p.gitEmail] = p;
    }
    return m;
  }, [productivity.data]);

  if (members.isLoading) return <LoadingSpinner />;
  if (members.error) return <ErrorDisplay retry={() => members.refetch()} />;

  const s = stats.data;
  const data = members.data || [];
  const heatmapData = heatmap.data || [];

  // Total tokens for KPI
  const totalTokens = (s?.totalInputTokens || 0) + (s?.totalOutputTokens || 0);

  // CSV export columns
  const csvColumns: { key: keyof MemberStatsItem; header: string }[] = [
    { key: 'gitEmail', header: 'メンバー' },
    { key: 'sessionCount', header: 'セッション数' },
    { key: 'totalInputTokens', header: '入力トークン' },
    { key: 'totalOutputTokens', header: '出力トークン' },
    { key: 'totalTokens', header: 'トークン合計' },
    { key: 'estimatedCost', header: '推定コスト' },
  ];

  // Table columns
  const columns = [
    {
      key: 'rank',
      header: 'ランク',
      render: (_: MemberStatsItem, i: number) => <RankBadge rank={i + 1} />,
    },
    {
      key: 'name',
      header: 'メンバー',
      render: (m: MemberStatsItem) => (
        <div>
          <div style={{ fontWeight: 600 }}>{m.displayName || m.gitEmail}</div>
          {m.displayName && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.gitEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'セッション数',
      align: 'right' as const,
      render: (m: MemberStatsItem) => (
        <span style={{ fontFamily: 'monospace' }}>{formatNumber(m.sessionCount)}</span>
      ),
    },
    {
      key: 'tokens',
      header: 'トークン',
      align: 'right' as const,
      render: (m: MemberStatsItem) => (
        <TokenBreakdown input={m.totalInputTokens} output={m.totalOutputTokens} compact />
      ),
    },
    {
      key: 'cost',
      header: 'コスト',
      align: 'right' as const,
      render: (m: MemberStatsItem) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {formatCost(m.estimatedCost)}
        </span>
      ),
    },
    {
      key: 'lastActivity',
      header: '最終アクティビティ',
      render: (m: MemberStatsItem) => {
        const d = lastActivity[m.gitEmail];
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {d ? formatDateShort(d) : '-'}
          </span>
        );
      },
    },
    {
      key: 'wow',
      header: '前週比',
      align: 'right' as const,
      render: (m: MemberStatsItem) => {
        const w = weekComparison[m.gitEmail];
        if (!w || w.direction === 'flat') {
          return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>;
        }
        const color = w.direction === 'up' ? 'var(--success)' : 'var(--danger, #ef4444)';
        const arrow = w.direction === 'up' ? '\u2191' : '\u2193';
        return (
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>
            {arrow} {Math.abs(w.pct).toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="メンバー分析"
        description="メンバー別の利用状況と活動分析"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'メンバー分析' }]}
        actions={
          <CsvExportButton
            data={data as unknown as Record<string, unknown>[]}
            columns={csvColumns as { key: string; header: string }[]}
            filename="members-analysis.csv"
          />
        }
      />
      <div className="page-body">
        {/* KPI Cards */}
        <KpiGrid>
          <KpiCard
            label="アクティブメンバー"
            value={formatNumber(s?.activeMembers || 0)}
            color="green"
          />
          <KpiCard
            label="総セッション"
            value={formatNumber(s?.totalSessions || 0)}
            color="blue"
          />
          <KpiCard
            label="総トークン"
            value={formatCompact(totalTokens)}
            color="purple"
          />
          <KpiCard
            label="推定コスト"
            value={formatCost(s?.totalCost || 0)}
            color="amber"
          />
        </KpiGrid>

        {/* Heatmap: Token count */}
        <ChartCard title="メンバー × 日付 トークン数">
          <MatrixHeatmap
            data={heatmapData}
            rowKey="displayName"
            colKey="date"
            valueKey="totalTokens"
            secondaryKey="sessionCount"
            tertiaryKey="turnCount"
            color={[59, 130, 246]}
            unitLabel="tokens"
            secondaryLabel="sessions"
            tertiaryLabel="turns"
            valueFmt={formatCompact}
            secondaryFmt={formatNumber}
            tertiaryFmt={formatNumber}
          />
        </ChartCard>

        {/* Heatmap: Session count */}
        <ChartCard title="メンバー × 日付 セッション数">
          <MatrixHeatmap
            data={heatmapData}
            rowKey="displayName"
            colKey="date"
            valueKey="sessionCount"
            secondaryKey="turnCount"
            tertiaryKey="totalTokens"
            color={[34, 197, 94]}
            unitLabel="sessions"
            secondaryLabel="turns"
            tertiaryLabel="tokens"
            valueFmt={formatNumber}
            secondaryFmt={formatNumber}
            tertiaryFmt={formatCompact}
          />
        </ChartCard>

        {/* Heatmap: Turn count */}
        <ChartCard title="メンバー × 日付 ターン数">
          <MatrixHeatmap
            data={heatmapData}
            rowKey="displayName"
            colKey="date"
            valueKey="turnCount"
            secondaryKey="sessionCount"
            tertiaryKey="totalTokens"
            color={[249, 115, 22]}
            unitLabel="turns"
            secondaryLabel="sessions"
            tertiaryLabel="tokens"
            valueFmt={formatNumber}
            secondaryFmt={formatNumber}
            tertiaryFmt={formatCompact}
          />
        </ChartCard>

        {/* Member Table */}
        <ChartCard title="メンバー一覧">
          <DataTable
            columns={columns}
            data={data}
            onRowClick={(m) => router.push(`/members/${encodeURIComponent(m.gitEmail)}`)}
            emptyMessage="選択したフィルタに該当するメンバーデータがありません"
          />
        </ChartCard>
      </div>
    </>
  );
}
