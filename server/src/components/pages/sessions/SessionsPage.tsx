'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { DataTable } from '@/components/shared/DataTable';
import { ClassificationBar } from '@/components/shared/ClassificationBar';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { SessionScatterChart } from '@/components/charts/ScatterChart';
import { useFilters } from '@/hooks/useFilters';
import { useStats, useSessions } from '@/hooks/useApi';
import { formatNumber, formatCompact, formatDateShort, formatSessionDuration, truncate, shortRepo } from '@/lib/formatters';
import { totalTokens } from '@/lib/tokenUtils';
import { classifySessions, getClassificationSummary } from '@/lib/session-classifier';

export function SessionsPage() {
  const router = useRouter();
  const { filters } = useFilters();
  const stats = useStats(filters);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'list' | 'scatter'>('list');
  const sessions = useSessions(filters, page, 20);

  if (sessions.isLoading) return <LoadingSpinner />;
  if (sessions.error) return <ErrorDisplay retry={() => sessions.refetch()} />;

  const s = stats.data;
  const sessionData = sessions.data?.data || [];
  const classified = classifySessions(sessionData);
  const summary = getClassificationSummary(classified);

  const columns = [
    {
      key: 'session',
      header: 'セッション',
      render: (item: typeof sessionData[number]) => (
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {truncate(item.firstPrompt || item.summary || '', 60)}
          </span>
        </div>
      ),
    },
    {
      key: 'model',
      header: 'モデル',
      render: (item: typeof sessionData[number]) => <ModelBadge model={item.model} />,
    },
    {
      key: 'tokens',
      header: 'トークン',
      align: 'right' as const,
      render: (item: typeof sessionData[number]) => (
        <span style={{ fontFamily: 'monospace' }}>
          {formatCompact(totalTokens(item))}
        </span>
      ),
    },
    {
      key: 'turns',
      header: 'ターン数',
      align: 'right' as const,
      render: (item: typeof sessionData[number]) => formatNumber(item.turnCount),
    },
    {
      key: 'duration',
      header: '所要時間',
      render: (item: typeof sessionData[number]) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {formatSessionDuration(item.durationMs, item.startedAt, item.endedAt)}
        </span>
      ),
    },
    {
      key: 'repo',
      header: 'リポジトリ',
      render: (item: typeof sessionData[number]) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {item.gitRepo ? shortRepo(item.gitRepo) : '-'}
        </span>
      ),
    },
    {
      key: 'time',
      header: '日時',
      render: (item: typeof sessionData[number]) => (
        <span style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
          {formatDateShort(item.startedAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="セッション分析"
        description="セッションの効率性と分類分析"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'セッション分析' }]}
      />
      <div className="page-body">
        <KpiGrid>
          <KpiCard label="マイセッション" value={formatNumber(s?.totalSessions || 0)} color="blue" />
          <KpiCard label="平均ターン数" value={String(s?.averageTurnsPerSession || 0)} color="green" />
          <KpiCard label="マイトークン" value={formatCompact(totalTokens(s || {}))} color="purple" />
          <KpiCard label="総ツール使用" value={formatNumber(s?.totalToolUses || 0)} color="amber" />
        </KpiGrid>

        <ClassificationBar summary={summary} total={sessionData.length} />

        {/* タブバー */}
        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
            マイセッション
          </button>
          <button className={`tab-btn ${tab === 'scatter' ? 'active' : ''}`} onClick={() => setTab('scatter')}>
            効率分析
          </button>
        </div>

        {tab === 'list' && (
          <>
            <ChartCard title={`セッション一覧 (全${sessions.data?.total || 0}件)`}>
              <DataTable
                columns={columns}
                data={sessionData}
                onRowClick={(item) => router.push(`/sessions/${item.id}`)}
              />
            </ChartCard>

            {/* ページネーション */}
            {sessions.data && sessions.data.total > 20 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  前へ
                </button>
                <span style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {page} / {Math.ceil(sessions.data.total / 20)} ページ
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={page >= Math.ceil(sessions.data.total / 20)}
                  onClick={() => setPage(p => p + 1)}
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'scatter' && (
          <ChartCard title="セッション散布図" subtitle="ターン数 vs トークン消費量" height={400}>
            <SessionScatterChart data={classified} />
          </ChartCard>
        )}
      </div>
    </>
  );
}
