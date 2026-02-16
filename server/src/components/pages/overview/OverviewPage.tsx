'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { HintCard } from '@/components/shared/HintCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { ChatPanel } from '@/components/shared/ChatPanel';
import { SlideOverPanel } from '@/components/shared/SlideOverPanel';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { DailyTokensChart } from '@/components/charts/DailyTokensChart';
import { ToolUsageChart } from '@/components/charts/ToolUsageChart';
import { HeatmapTable } from '@/components/charts/HeatmapTable';
import { DateHeatmapTable } from '@/components/charts/DateHeatmapTable';
import { useFilters } from '@/hooks/useFilters';
import {
  useStats,
  useDailyStats,
  useToolStats,
  useHeatmapData,
  useMemberStats,
  useRepoDateHeatmap,
  useMemberDateHeatmap,
} from '@/hooks/useApi';
import { formatCompact, formatCost, formatNumber, shortRepo } from '@/lib/formatters';
import { generateHints } from '@/lib/hints';
import { splitWeeks, calcTrend } from '@/lib/trend';

export function OverviewPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { filters } = useFilters();
  const stats = useStats(filters);
  const daily = useDailyStats(filters);
  const tools = useToolStats(filters);
  const heatmap = useHeatmapData(filters);
  const members = useMemberStats(filters);
  const repoDateHeatmap = useRepoDateHeatmap(filters);
  const memberDateHeatmap = useMemberDateHeatmap(filters);

  if (stats.isLoading) return <LoadingSpinner />;
  if (stats.error) return <ErrorDisplay retry={() => stats.refetch()} />;
  if (!stats.data) return null;

  const s = stats.data;

  // Calculate week-over-week trends
  const weeks = daily.data ? splitWeeks(daily.data) : null;
  const sessionTrend = weeks ? calcTrend(weeks.current.sessions, weeks.previous.sessions) : null;
  const costTrend = weeks ? calcTrend(weeks.current.cost, weeks.previous.cost) : null;
  const tokenTrend = weeks ? calcTrend(
    weeks.current.inputTokens + weeks.current.outputTokens,
    weeks.previous.inputTokens + weeks.previous.outputTokens,
  ) : null;

  // Generate hints
  const hints = tools.data && members.data
    ? generateHints(s, tools.data, members.data)
    : [];

  // Helper: member label
  const memberLabel = (v: string) => {
    const item = memberDateHeatmap.data?.find((d) => d.gitEmail === v);
    return item?.displayName || v;
  };

  return (
    <>
      <PageHeader
        title="概要・AI分析"
        description="チームのAI利用状況サマリー"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setIsChatOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Bot size={14} />
            AI 分析チャット
          </button>
        }
      />

      <SlideOverPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        title="AI 分析チャット"
      >
        <ChatPanel
          context={{ type: 'global' }}
          placeholder="チームの利用状況について質問... (例: 今週のコスト傾向は？)"
          height="100%"
        />
      </SlideOverPanel>

      <div className="page-body">
        {/* KPI カード */}
        <KpiGrid>
          <KpiCard
            label="総セッション"
            value={formatNumber(s.totalSessions)}
            sub={`${s.activeMembers} アクティブメンバー`}
            color="blue"
            trend={sessionTrend ? { direction: sessionTrend.direction, label: sessionTrend.label, goodDirection: 'up' } : undefined}
          />
          <KpiCard
            label="総トークン"
            value={formatCompact(s.totalInputTokens + s.totalOutputTokens)}
            sub={`平均 ${formatCompact((s.totalInputTokens + s.totalOutputTokens) / Math.max(s.totalSessions, 1))}/セッション`}
            color="purple"
            trend={tokenTrend ? { direction: tokenTrend.direction, label: tokenTrend.label, goodDirection: 'up' } : undefined}
          />
          <KpiCard
            label="推定コスト"
            value={formatCost(s.totalCost)}
            sub={`平均 ${formatCost(s.averageCostPerSession)}/セッション`}
            color="amber"
            trend={costTrend ? { direction: costTrend.direction, label: costTrend.label, goodDirection: 'down' } : undefined}
          />
          <KpiCard
            label="アクティブメンバー"
            value={formatNumber(s.activeMembers)}
            sub={`${formatNumber(s.totalTurns)} 総ターン数`}
            color="green"
          />
        </KpiGrid>

        {/* ヒント */}
        {hints.slice(0, 2).map((hint, i) => (
          <HintCard key={i} hint={hint} />
        ))}

        {/* チャート行 1: 日別トークン推移 + ツール使用状況 */}
        <div className="grid-2">
          <ChartCard title="日別トークン推移" height={300}>
            {daily.data ? (
              <DailyTokensChart data={daily.data} />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
          <ChartCard title="ツール使用状況 Top 10" height={300}>
            {tools.data ? (
              <ToolUsageChart data={tools.data} />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
        </div>

        {/* 時間帯別アクティビティ */}
        <ChartCard title="時間帯別アクティビティ" subtitle="曜日 × 時間帯ごとのセッション数">
          {heatmap.data ? (
            <HeatmapTable data={heatmap.data} />
          ) : (
            <LoadingSpinner />
          )}
        </ChartCard>

        {/* ヒートマップ行 1: リポジトリ（セッション数 + トークン数）- 2カラム */}
        <div className="grid-2">
          <ChartCard title="リポジトリ × 日付 セッション数">
            {repoDateHeatmap.data ? (
              <DateHeatmapTable
                data={repoDateHeatmap.data}
                rowKey="gitRepo"
                dateKey="date"
                valueKey="sessionCount"
                labelFn={shortRepo}
                valueFmt={formatNumber}
                color={[34, 197, 94]}
                unitLabel="sessions"
                secondaryKey="totalTokens"
                secondaryLabel="tokens"
                secondaryFmt={formatCompact}
                tertiaryKey="turnCount"
                tertiaryLabel="turns"
                tertiaryFmt={formatNumber}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
          <ChartCard title="リポジトリ × 日付 トークン数">
            {repoDateHeatmap.data ? (
              <DateHeatmapTable
                data={repoDateHeatmap.data}
                rowKey="gitRepo"
                dateKey="date"
                valueKey="totalTokens"
                labelFn={shortRepo}
                valueFmt={formatCompact}
                color={[59, 130, 246]}
                unitLabel="tokens"
                secondaryKey="sessionCount"
                secondaryLabel="sessions"
                secondaryFmt={formatNumber}
                tertiaryKey="turnCount"
                tertiaryLabel="turns"
                tertiaryFmt={formatNumber}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
        </div>

        {/* ヒートマップ行 2: リポジトリ ターン数 + メンバー セッション数 - 2カラム */}
        <div className="grid-2">
          <ChartCard title="リポジトリ × 日付 ターン数">
            {repoDateHeatmap.data ? (
              <DateHeatmapTable
                data={repoDateHeatmap.data}
                rowKey="gitRepo"
                dateKey="date"
                valueKey="turnCount"
                labelFn={shortRepo}
                valueFmt={formatNumber}
                color={[249, 115, 22]}
                unitLabel="turns"
                secondaryKey="sessionCount"
                secondaryLabel="sessions"
                secondaryFmt={formatNumber}
                tertiaryKey="totalTokens"
                tertiaryLabel="tokens"
                tertiaryFmt={formatCompact}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
          <ChartCard title="メンバー × 日付 セッション数">
            {memberDateHeatmap.data ? (
              <DateHeatmapTable
                data={memberDateHeatmap.data}
                rowKey="gitEmail"
                dateKey="date"
                valueKey="sessionCount"
                labelFn={memberLabel}
                valueFmt={formatNumber}
                color={[34, 197, 94]}
                unitLabel="sessions"
                secondaryKey="totalTokens"
                secondaryLabel="tokens"
                secondaryFmt={formatCompact}
                tertiaryKey="turnCount"
                tertiaryLabel="turns"
                tertiaryFmt={formatNumber}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
        </div>

        {/* ヒートマップ行 3: メンバー（トークン数 + ターン数）- 2カラム */}
        <div className="grid-2">
          <ChartCard title="メンバー × 日付 トークン数">
            {memberDateHeatmap.data ? (
              <DateHeatmapTable
                data={memberDateHeatmap.data}
                rowKey="gitEmail"
                dateKey="date"
                valueKey="totalTokens"
                labelFn={memberLabel}
                valueFmt={formatCompact}
                color={[147, 51, 234]}
                unitLabel="tokens"
                secondaryKey="sessionCount"
                secondaryLabel="sessions"
                secondaryFmt={formatNumber}
                tertiaryKey="turnCount"
                tertiaryLabel="turns"
                tertiaryFmt={formatNumber}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
          <ChartCard title="メンバー × 日付 ターン数">
            {memberDateHeatmap.data ? (
              <DateHeatmapTable
                data={memberDateHeatmap.data}
                rowKey="gitEmail"
                dateKey="date"
                valueKey="turnCount"
                labelFn={memberLabel}
                valueFmt={formatNumber}
                color={[249, 115, 22]}
                unitLabel="turns"
                secondaryKey="sessionCount"
                secondaryLabel="sessions"
                secondaryFmt={formatNumber}
                tertiaryKey="totalTokens"
                tertiaryLabel="tokens"
                tertiaryFmt={formatCompact}
              />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}
