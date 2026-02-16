'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { DataTable } from '@/components/shared/DataTable';
import { ClassificationBar } from '@/components/shared/ClassificationBar';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { TokenBreakdown } from '@/components/shared/TokenBreakdown';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { MemberAnalysisPanel } from '@/components/shared/MemberAnalysisPanel';
import { SlideOverPanel } from '@/components/shared/SlideOverPanel';
import { WeeklyTrendChart } from '@/components/charts/WeeklyTrendChart';
import { ToolUsageChart } from '@/components/charts/ToolUsageChart';
import '@/components/charts/ChartSetup';
import { useFilters } from '@/hooks/useFilters';
import {
  useMemberDetail,
  useMemberStats,
  useProductivityMetrics,
  useToolStats,
} from '@/hooks/useApi';
import {
  formatCompact,
  formatNumber,
  formatDateShort,
  formatSessionDuration,
  shortModel,
  truncate,
} from '@/lib/formatters';
import { totalTokens as calcTotalTokens } from '@/lib/tokenUtils';
import { COLORS, MODEL_COLORS } from '@/lib/constants';
import { classifySessions, getClassificationSummary } from '@/lib/session-classifier';
import type { DailyStatsItem, SessionItem } from '@/lib/types';

interface MemberDetailPageProps {
  email: string;
}

export function MemberDetailPage({ email }: MemberDetailPageProps) {
  const router = useRouter();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const { filters } = useFilters();

  // Merge the member filter so that tool stats are scoped to this member
  const memberFilters = useMemo(() => ({ ...filters, member: email }), [filters, email]);

  const detail = useMemberDetail(email, filters);
  const members = useMemberStats(filters);
  const productivity = useProductivityMetrics(filters);
  const toolStats = useToolStats(memberFilters);

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error) return <ErrorDisplay retry={() => detail.refetch()} />;
  if (!detail.data) return null;

  const d = detail.data;
  const memberInfo = members.data?.find(m => m.gitEmail === email);
  const prodInfo = productivity.data?.find(p => p.gitEmail === email);

  // Total tokens
  const totalTokens = memberInfo
    ? calcTotalTokens(memberInfo)
    : d.dailyStats.reduce((s, ds) => s + calcTotalTokens(ds), 0);

  // Avg turns per session
  const avgTurns = prodInfo?.avgTurns ?? 0;

  // Display name
  const displayName = memberInfo?.displayName || email;

  // Build daily stats for WeeklyTrendChart (needs DailyStatsItem shape)
  const dailyForChart: DailyStatsItem[] = d.dailyStats.map(ds => ({
    date: ds.date,
    sessionCount: ds.sessionCount,
    totalInputTokens: ds.inputTokens,
    totalOutputTokens: ds.outputTokens,
    totalCacheCreationTokens: ds.cacheCreationTokens || 0,
    totalCacheReadTokens: ds.cacheReadTokens || 0,
    estimatedCost: 0,
  }));

  // Session classification
  const recentSessions = d.recentSessions || [];
  const classified = classifySessions(recentSessions as SessionItem[]);
  const classificationSummary = getClassificationSummary(classified);

  // Model doughnut data
  const modelData = d.modelBreakdown || [];

  // Tool stats
  const tools = toolStats.data || [];

  // Session columns for recent sessions table
  const sessionColumns = [
    {
      key: 'session',
      header: 'セッション',
      render: (s: SessionItem) => {
        const uuid = s.sessionUuid || String(s.id);
        const shortId = uuid.length > 12 ? uuid.substring(0, 12) + '...' : uuid;
        const title = s.summary || s.firstPrompt || '-';
        return (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{shortId}</div>
            <div style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {truncate(title, 50)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'model',
      header: 'モデル',
      render: (s: SessionItem) => <ModelBadge model={s.model} />,
    },
    {
      key: 'tokens',
      header: 'トークン',
      align: 'right' as const,
      render: (s: SessionItem) => (
        <TokenBreakdown input={s.totalInputTokens} output={s.totalOutputTokens} cacheCreation={s.totalCacheCreationTokens} cacheRead={s.totalCacheReadTokens} compact />
      ),
    },
    {
      key: 'turns',
      header: 'ターン数',
      align: 'right' as const,
      render: (s: SessionItem) => (
        <span style={{ fontFamily: 'monospace' }}>{formatNumber(s.turnCount)}</span>
      ),
    },
    {
      key: 'duration',
      header: '所要時間',
      render: (s: SessionItem) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {formatSessionDuration(s.durationMs, s.startedAt, s.endedAt)}
        </span>
      ),
    },
    {
      key: 'date',
      header: '日時',
      render: (s: SessionItem) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDateShort(s.startedAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={displayName}
        description={email}
        breadcrumbs={[
          { label: '概要', href: '/' },
          { label: 'メンバー分析', href: '/members' },
          { label: displayName },
        ]}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setIsAnalysisOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Bot size={14} />
            AI コーチング
          </button>
        }
      />

      <SlideOverPanel
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        title={`${displayName} の AI コーチング`}
      >
        <MemberAnalysisPanel email={email} displayName={displayName} />
      </SlideOverPanel>
      <div className="page-body">
        {/* KPI Cards */}
        <KpiGrid>
          <KpiCard
            label="総セッション"
            value={formatNumber(memberInfo?.sessionCount || 0)}
            color="blue"
          />
          <KpiCard
            label="総トークン"
            value={formatCompact(totalTokens)}
            color="purple"
          />
          <KpiCard
            label="総ターン数"
            value={formatNumber(memberInfo?.totalTurns || 0)}
            color="amber"
          />
          <KpiCard
            label="平均ターン数"
            value={avgTurns.toFixed(1)}
            color="green"
          />
        </KpiGrid>

        {/* Weekly Trend Chart */}
        <ChartCard title="週次トレンド" height={250}>
          <WeeklyTrendChart data={dailyForChart} metric="tokens" />
        </ChartCard>

        {/* Session Classification Bar */}
        {recentSessions.length > 0 && (
          <ChartCard title="セッション分類">
            <ClassificationBar summary={classificationSummary} total={classified.length} />
          </ChartCard>
        )}

        {/* Two-column: Daily Tokens + Model Doughnut */}
        <div className="grid-2">
          <ChartCard title="日別トークン推移" height={250}>
            {d.dailyStats.length > 0 ? (
              <Bar
                data={{
                  labels: d.dailyStats.map(ds => ds.date),
                  datasets: [{
                    label: 'トークン',
                    data: d.dailyStats.map(ds => calcTotalTokens(ds)),
                    backgroundColor: COLORS.primary,
                    borderRadius: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => `トークン: ${formatCompact(ctx.parsed.y ?? 0)}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      type: 'time' as const,
                      time: { unit: 'day', displayFormats: { day: 'MM/dd' } },
                      grid: { display: false },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (v) => formatCompact(Number(v)) },
                    },
                  },
                }}
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                データがありません
              </div>
            )}
          </ChartCard>

          <ChartCard title="モデル利用比率" height={250}>
            {modelData.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
                <Doughnut
                  data={{
                    labels: modelData.map(m => shortModel(m.model)),
                    datasets: [{
                      data: modelData.map(m => m.sessionCount),
                      backgroundColor: modelData.map(m => {
                        const key = m.model.includes('opus') ? 'opus'
                          : m.model.includes('sonnet') ? 'sonnet'
                          : m.model.includes('haiku') ? 'haiku'
                          : 'sonnet';
                        return MODEL_COLORS[key] || '#64748b';
                      }),
                      borderWidth: 0,
                      hoverOffset: 4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '55%',
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom' as const,
                        labels: {
                          padding: 10,
                          usePointStyle: true,
                          pointStyle: 'circle',
                          font: { size: 11 },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: ctx => {
                            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(0) : '0';
                            return `${ctx.label}: ${ctx.parsed} セッション (${pct}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                データがありません
              </div>
            )}
          </ChartCard>
        </div>

        {/* Tool Usage Pattern */}
        <ChartCard title="ツール使用パターン" height={300}>
          {tools.length > 0 ? (
            <ToolUsageChart data={tools} limit={15} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              データがありません
            </div>
          )}
        </ChartCard>

        {/* Recent Sessions Table */}
        <ChartCard
          title={`最近のセッション (${recentSessions.length}件)`}
        >
          <DataTable
            columns={sessionColumns}
            data={recentSessions as SessionItem[]}
            onRowClick={(s) => router.push(`/sessions/${s.id}`)}
            emptyMessage="セッションデータがありません"
          />
        </ChartCard>

      </div>
    </>
  );
}
