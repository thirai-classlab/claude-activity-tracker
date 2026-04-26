'use client';

import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import { ModelDonutChart } from '@/components/charts/ModelDonutChart';
import { MemberTokenBarChart } from '@/components/charts/MemberTokenBarChart';
import { ModelSimulationTable } from './ModelSimulationTable';
import { ModelPricingOverrideTable } from './ModelPricingOverrideTable';
import { useFilters } from '@/hooks/useFilters';
import { useStats, useDailyStats, useCostStats, useMemberStats } from '@/hooks/useApi';
import { COLORS, MODEL_COLORS } from '@/lib/constants';
import { formatCompact, formatCost, formatNumber } from '@/lib/formatters';
import { shortModel } from '@/lib/formatters';
import { totalTokens as calcTotalTokens } from '@/lib/tokenUtils';
import type { CostStatsItem, DailyStatsItem } from '@/lib/types';
import '@/components/charts/ChartSetup';

// ---------------------------------------------------------------------------
// Sub-tab control
// ---------------------------------------------------------------------------

type TrendTab = 'cost' | 'tokens';

interface TabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function TabButton({ active, label, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '6px',
        border: '1px solid var(--border, #334155)',
        background: active ? 'var(--accent, #3b82f6)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Daily cost stacked-by-model chart
// ---------------------------------------------------------------------------

function buildCostChart(costs: CostStatsItem[]): ChartData<'bar'> {
  const dateSet = new Set<string>();
  const modelSet = new Set<string>();
  const grid: Record<string, Record<string, number>> = {};

  for (const c of costs) {
    const date = String(c.date).split('T')[0];
    dateSet.add(date);
    modelSet.add(c.model);
    grid[date] = grid[date] || {};
    grid[date][c.model] = (grid[date][c.model] || 0) + Number(c.cost || 0);
  }

  const dates = Array.from(dateSet).sort();
  const models = Array.from(modelSet).sort();

  const datasets = models.map((model, idx) => {
    const family = shortModel(model).toLowerCase();
    const color = MODEL_COLORS[family] || COLORS.chart[idx % COLORS.chart.length];
    return {
      label: model,
      data: dates.map(d => Number(grid[d]?.[model] || 0)),
      backgroundColor: color + 'cc',
      borderRadius: 3,
      stack: 'cost',
    };
  });

  return { labels: dates, datasets };
}

function buildTokenChart(daily: DailyStatsItem[]): ChartData<'bar'> {
  return {
    labels: daily.map(d => String(d.date).split('T')[0]),
    datasets: [
      {
        label: 'Input',
        data: daily.map(d => Number(d.totalInputTokens) || 0),
        backgroundColor: COLORS.sonnet + 'cc',
        borderRadius: 3,
        stack: 'tokens',
      },
      {
        label: 'Output',
        data: daily.map(d => Number(d.totalOutputTokens) || 0),
        backgroundColor: COLORS.opus + 'cc',
        borderRadius: 3,
        stack: 'tokens',
      },
      {
        label: 'Cache Create',
        data: daily.map(d => Number(d.totalCacheCreationTokens) || 0),
        backgroundColor: COLORS.warning + 'cc',
        borderRadius: 3,
        stack: 'tokens',
      },
      // cache_read intentionally excluded — see docs/specs/005-meaningful-charts.md
    ],
  };
}

// ---------------------------------------------------------------------------
// TokensPage
// ---------------------------------------------------------------------------

export function TokensPage() {
  const { filters } = useFilters();
  const stats = useStats(filters);
  const daily = useDailyStats(filters);
  const costs = useCostStats(filters);
  const members = useMemberStats(filters);

  const [trendTab, setTrendTab] = useState<TrendTab>('cost');

  const costChart = useMemo<ChartData<'bar'>>(
    () => buildCostChart(costs.data || []),
    [costs.data],
  );

  const tokenChart = useMemo<ChartData<'bar'>>(
    () => buildTokenChart(daily.data || []),
    [daily.data],
  );

  if (stats.isLoading) return <LoadingSpinner />;
  if (stats.error) return <ErrorDisplay retry={() => stats.refetch()} />;
  if (!stats.data) return null;

  const s = stats.data;
  const totalTokens = calcTotalTokens(s);
  // Defensive clamp: server already constrains the value to [0, 1] via
  // computeCacheEfficiency, but we keep a UI-side guard so a stale / corrupted
  // payload cannot render >100% in the KPI badge.
  // Spec: docs/specs/004-phase1-remaining-bugs.md (bug #12)
  const cacheHitRatio = Math.min(1, Math.max(0, s.cacheEfficiency || 0));
  const cacheHitPercent = `${(cacheHitRatio * 100).toFixed(0)}%`;

  // Model breakdown from cost stats — used by the donut chart.
  const modelMap = new Map<string, number>();
  if (costs.data) {
    for (const c of costs.data) {
      modelMap.set(c.model, (modelMap.get(c.model) || 0) + c.cost);
    }
  }
  const modelData = Array.from(modelMap.entries()).map(([model, cost]) => ({
    model,
    value: cost,
  }));

  const costChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', align: 'end' },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${formatCost(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, ticks: { callback: v => formatCost(Number(v)) } },
    },
  };

  const tokenChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', align: 'end' },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${formatCompact(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, ticks: { callback: v => formatCompact(Number(v)) } },
    },
  };

  return (
    <>
      <PageHeader
        title="トークン分析"
        description="日別 $ コスト推移を主役に、トークン詳細はサブで表示"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'トークン分析' }]}
        actions={
          members.data ? (
            <CsvExportButton
              data={members.data as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'gitEmail', header: 'メール' },
                { key: 'displayName', header: '名前' },
                { key: 'totalInputTokens', header: '入力トークン' },
                { key: 'totalOutputTokens', header: '出力トークン' },
                { key: 'totalCacheCreationTokens', header: 'Cache作成トークン' },
                { key: 'totalCacheReadTokens', header: 'Cache読取トークン' },
                { key: 'estimatedCost', header: 'コスト' },
              ]}
              filename="token-analysis.csv"
            />
          ) : null
        }
      />
      <div className="page-body">
        <KpiGrid>
          <KpiCard
            label="推定コスト"
            value={formatCost(s.totalCost)}
            sub={`平均 ${formatCost(s.averageCostPerSession)}/セッション`}
            color="amber"
          />
          <KpiCard
            label="入力トークン"
            value={formatCompact(s.totalInputTokens)}
            sub={`全体の${((s.totalInputTokens / Math.max(totalTokens, 1)) * 100).toFixed(0)}%`}
            color="blue"
          />
          <KpiCard
            label="出力トークン"
            value={formatCompact(s.totalOutputTokens)}
            sub={`全体の${((s.totalOutputTokens / Math.max(totalTokens, 1)) * 100).toFixed(0)}%`}
            color="green"
          />
          <KpiCard
            label="キャッシュ"
            value={cacheHitPercent}
            sub={`累積 cache_read ${formatCompact(s.totalCacheReadTokens)}`}
            color="purple"
          />
        </KpiGrid>

        {/* 主役: 日別 $ 推移（モデル別積み上げ）+ サブタブで raw tokens */}
        <ChartCard
          title={trendTab === 'cost' ? '日別コスト推移（モデル別積み上げ）' : '日別トークン推移（cache_read 除外）'}
          subtitle={
            trendTab === 'cost'
              ? '価値 ($) を主役に。量グラフはサブタブで参照'
              : 'input / output / cache_create のみ — cache_read は KPI で表示済み'
          }
          height={320}
          action={
            <div style={{ display: 'flex', gap: '8px' }}>
              <TabButton
                active={trendTab === 'cost'}
                label="$ コスト"
                onClick={() => setTrendTab('cost')}
              />
              <TabButton
                active={trendTab === 'tokens'}
                label="トークン (cache_read 除く)"
                onClick={() => setTrendTab('tokens')}
              />
            </div>
          }
        >
          {trendTab === 'cost' ? (
            costs.data && costs.data.length > 0 ? (
              <Bar data={costChart} options={costChartOptions} />
            ) : (
              <LoadingSpinner />
            )
          ) : daily.data && daily.data.length > 0 ? (
            <Bar data={tokenChart} options={tokenChartOptions} />
          ) : (
            <LoadingSpinner />
          )}
        </ChartCard>

        {/* モデル別コスト + メンバー別トークン */}
        <div className="grid-2">
          <ChartCard title="モデル別コスト" height={250}>
            {modelData.length > 0 ? (
              <ModelDonutChart data={modelData} label="コスト" />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
          <ChartCard title="メンバー別トークン" height={250}>
            {members.data ? (
              <MemberTokenBarChart data={members.data} />
            ) : (
              <LoadingSpinner />
            )}
          </ChartCard>
        </div>

        {/* モデルミックスシミュレーション */}
        <ChartCard title="モデルミックスシミュレーション" subtitle="Opus比率を変えた場合の月間推定コスト">
          <ModelSimulationTable
            totalTokens={totalTokens}
            currentCost={s.totalCost}
            sessions={s.totalSessions}
          />
        </ChartCard>

        {/* 料金オーバーライド (admin UI) */}
        <ChartCard
          title="料金オーバーライド"
          subtitle="manual_override レコードはシンク値より優先されます"
        >
          <ModelPricingOverrideTable />
        </ChartCard>

        {/* 参考: 数値で見る合計 */}
        <KpiGrid>
          <KpiCard
            label="総トークン"
            value={formatCompact(totalTokens)}
            sub={`セッション ${formatNumber(s.totalSessions)}`}
            color="purple"
          />
          <KpiCard
            label="累積 cache_read"
            value={formatCompact(s.totalCacheReadTokens)}
            sub="グラフからは除外（量で歪むため）"
            color="cyan"
          />
        </KpiGrid>
      </div>
    </>
  );
}
