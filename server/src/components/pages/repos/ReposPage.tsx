'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { useFilters } from '@/hooks/useFilters';
import { useRepoStats, useStats } from '@/hooks/useApi';
import { formatNumber, formatCompact, formatCost, formatDateShort, shortRepo } from '@/lib/formatters';

export function ReposPage() {
  const router = useRouter();
  const { filters } = useFilters();
  const stats = useStats(filters);
  const repos = useRepoStats(filters);

  if (repos.isLoading) return <LoadingSpinner />;
  if (repos.error) return <ErrorDisplay retry={() => repos.refetch()} />;

  const data = repos.data || [];

  const columns = [
    {
      key: 'repo',
      header: 'リポジトリ名',
      render: (item: typeof data[number]) => (
        <div>
          <div style={{ fontWeight: 600 }}>{shortRepo(item.gitRepo)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.gitRepo}</div>
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'セッション数',
      align: 'right' as const,
      render: (item: typeof data[number]) => (
        <span className="font-mono">{formatNumber(item.sessionCount)}</span>
      ),
    },
    {
      key: 'tokens',
      header: 'トークン',
      align: 'right' as const,
      render: (item: typeof data[number]) => (
        <span className="font-mono">{formatCompact(item.totalInputTokens + item.totalOutputTokens)}</span>
      ),
    },
    {
      key: 'cost',
      header: 'コスト',
      align: 'right' as const,
      render: (item: typeof data[number]) => (
        <span className="font-mono">{formatCost(item.estimatedCost)}</span>
      ),
    },
    {
      key: 'members',
      header: 'メンバー数',
      align: 'right' as const,
      render: (item: typeof data[number]) => (
        <span className="font-mono">{formatNumber(item.memberCount)}</span>
      ),
    },
    {
      key: 'lastUsed',
      header: '最終アクティビティ',
      render: (item: typeof data[number]) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDateShort(item.lastUsed)}
        </span>
      ),
    },
  ];

  const totalTokens = (stats.data?.totalInputTokens || 0) + (stats.data?.totalOutputTokens || 0);

  return (
    <>
      <PageHeader
        title="リポジトリ分析"
        description="リポジトリ別の利用状況と活動分析"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'リポジトリ分析' }]}
      />
      <div className="page-body">
        <KpiGrid>
          <KpiCard label="リポジトリ数" value={formatNumber(stats.data?.repoCount || data.length || 0)} color="blue" />
          <KpiCard label="総セッション" value={formatNumber(stats.data?.totalSessions || 0)} color="purple" />
          <KpiCard label="総トークン" value={formatCompact(totalTokens)} color="amber" />
          <KpiCard label="アクティブメンバー" value={formatNumber(stats.data?.activeMembers || 0)} color="green" />
        </KpiGrid>

        <ChartCard title="リポジトリ別セッション・トークン">
          <DataTable
            columns={columns}
            data={data}
            onRowClick={(item) => router.push(`/repos/${encodeURIComponent(item.gitRepo)}`)}
            emptyMessage="選択されたフィルタに該当するリポジトリデータがありません"
          />
        </ChartCard>
      </div>
    </>
  );
}
