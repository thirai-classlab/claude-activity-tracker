'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import { TokenForecastChart } from '@/components/charts/TokenForecastChart';
import { ModelDonutChart } from '@/components/charts/ModelDonutChart';
import { MemberTokenBarChart } from '@/components/charts/MemberTokenBarChart';
import { ModelSimulationTable } from './ModelSimulationTable';
import { useFilters } from '@/hooks/useFilters';
import { useStats, useDailyStats, useCostStats, useMemberStats } from '@/hooks/useApi';
import { formatCompact, formatCost, formatNumber } from '@/lib/formatters';
import { totalTokens as calcTotalTokens } from '@/lib/tokenUtils';
import { COST_RATES } from '@/lib/constants';

export function TokensPage() {
  const { filters } = useFilters();
  const stats = useStats(filters);
  const daily = useDailyStats(filters);
  const costs = useCostStats(filters);
  const members = useMemberStats(filters);

  if (stats.isLoading) return <LoadingSpinner />;
  if (stats.error) return <ErrorDisplay retry={() => stats.refetch()} />;
  if (!stats.data) return null;

  const s = stats.data;
  const totalTokens = calcTotalTokens(s);

  // Model breakdown from cost stats
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

  return (
    <>
      <PageHeader
        title="トークン分析"
        description="トークン消費量、コスト内訳、予測分析"
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
          <KpiCard label="総トークン" value={formatCompact(totalTokens)} sub={`Cache効率 ${((s.cacheEfficiency) * 100).toFixed(0)}%`} color="purple" />
          <KpiCard label="入力トークン" value={formatCompact(s.totalInputTokens)} sub={`全体の${((s.totalInputTokens / Math.max(totalTokens, 1)) * 100).toFixed(0)}%`} color="blue" />
          <KpiCard label="出力トークン" value={formatCompact(s.totalOutputTokens)} sub={`全体の${((s.totalOutputTokens / Math.max(totalTokens, 1)) * 100).toFixed(0)}%`} color="green" />
          <KpiCard label="推定コスト" value={formatCost(s.totalCost)} sub={`平均 ${formatCost(s.averageCostPerSession)}/セッション`} color="amber" />
        </KpiGrid>

        {/* トークン予測 */}
        <ChartCard title="トークン予測" subtitle="実績 + 線形回帰予測" height={300}>
          {daily.data ? <TokenForecastChart data={daily.data} /> : <LoadingSpinner />}
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
      </div>
    </>
  );
}
