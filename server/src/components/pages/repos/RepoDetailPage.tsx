'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { DailyActivityChart } from '@/components/charts/DailyActivityChart';
import { ContributorBarChart } from '@/components/charts/ContributorBarChart';
import { useFilters } from '@/hooks/useFilters';
import { useRepoDetail, useRepoStats } from '@/hooks/useApi';
import {
  formatNumber,
  formatCompact,
  formatCost,
  formatDateShort,
  shortRepo,
  truncate,
} from '@/lib/formatters';
import { totalTokens as calcTotalTokens } from '@/lib/tokenUtils';
import type { SessionItem, RepoDetailResponse } from '@/lib/types';
import { ChevronDown, ChevronRight, GitBranch, ExternalLink } from 'lucide-react';

type BranchItem = RepoDetailResponse['branches'][number];
type BranchSession = BranchItem['sessions'][number];

interface RepoDetailPageProps {
  repoId: string;
}

export function RepoDetailPage({ repoId }: RepoDetailPageProps) {
  const { filters } = useFilters();
  const repo = decodeURIComponent(repoId);
  const detail = useRepoDetail(repo, filters);
  const repos = useRepoStats(filters);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error) return <ErrorDisplay retry={() => detail.refetch()} />;
  if (!detail.data) return null;

  const d = detail.data;
  const repoInfo = repos.data?.find(r => r.gitRepo === repo);
  const totalTokens = repoInfo
    ? calcTotalTokens(repoInfo)
    : 0;
  const estimatedCost = repoInfo?.estimatedCost || 0;

  const toggleBranch = (branch: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branch)) next.delete(branch);
      else next.add(branch);
      return next;
    });
  };

  // --- Recent sessions table columns ---
  const sessionColumns = [
    {
      key: 'member',
      header: 'メンバー',
      render: (item: SessionItem) => (
        <span style={{ fontSize: '12px' }}>
          {item.member?.displayName || item.member?.gitEmail || '-'}
        </span>
      ),
    },
    {
      key: 'summary',
      header: '概要',
      render: (item: SessionItem) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {truncate(item.summary || item.firstPrompt || '-', 60)}
        </span>
      ),
    },
    {
      key: 'tokens',
      header: 'トークン',
      align: 'right' as const,
      render: (item: SessionItem) => (
        <span className="font-mono" style={{ fontSize: '12px' }}>
          {formatCompact(calcTotalTokens(item))}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'コスト',
      align: 'right' as const,
      render: (item: SessionItem) => (
        <span className="font-mono" style={{ fontSize: '12px' }}>
          {formatCost(item.estimatedCost)}
        </span>
      ),
    },
    {
      key: 'date',
      header: '最終更新日',
      render: (item: SessionItem) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDateShort(item.endedAt || item.startedAt)}
        </span>
      ),
    },
  ];

  // --- Frequent files table columns ---
  const frequentFiles = d.frequentFiles || [];
  const fileColumns = [
    {
      key: 'filePath',
      header: 'ファイルパス',
      render: (item: typeof frequentFiles[number]) => (
        <span className="font-mono" style={{ fontSize: '12px' }}>
          {item.filePath}
        </span>
      ),
    },
    {
      key: 'changeCount',
      header: '変更回数',
      align: 'right' as const,
      render: (item: typeof frequentFiles[number]) => (
        <span className="font-mono">{formatNumber(item.changeCount)}</span>
      ),
    },
    {
      key: 'lastChanged',
      header: '最終変更',
      render: (item: typeof frequentFiles[number]) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDateShort(item.lastChanged)}
        </span>
      ),
    },
  ];

  // --- Branch session columns ---
  const branchSessionColumns = [
    {
      key: 'member',
      header: 'メンバー',
      render: (item: BranchSession) => (
        <span style={{ fontSize: '12px' }}>
          {item.displayName || item.gitEmail}
        </span>
      ),
    },
    {
      key: 'summary',
      header: '概要',
      render: (item: BranchSession) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {truncate(item.summary || '-', 50)}
        </span>
      ),
    },
    {
      key: 'turnCount',
      header: 'ターン数',
      align: 'right' as const,
      render: (item: BranchSession) => (
        <span className="font-mono" style={{ fontSize: '12px' }}>
          {formatNumber(item.turnCount)}
        </span>
      ),
    },
    {
      key: 'fileChangeCount',
      header: 'ファイル変更数',
      align: 'right' as const,
      render: (item: BranchSession) => (
        <span className="font-mono" style={{ fontSize: '12px' }}>
          {formatNumber(item.fileChangeCount)}
        </span>
      ),
    },
    {
      key: 'date',
      header: '最終更新日',
      render: (item: BranchSession) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatDateShort(item.endedAt || item.startedAt)}
        </span>
      ),
    },
    {
      key: 'link',
      header: '',
      align: 'right' as const,
      render: (item: BranchSession) => (
        <Link
          href={`/sessions/${item.id}`}
          style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
        >
          詳細 <ExternalLink size={12} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={shortRepo(repo)}
        description={repo}
        breadcrumbs={[
          { label: '概要', href: '/' },
          { label: 'リポジトリ分析', href: '/repos' },
          { label: shortRepo(repo) },
        ]}
      />
      <div className="page-body">
        {/* KPI cards */}
        <KpiGrid>
          <KpiCard label="総セッション" value={formatNumber(repoInfo?.sessionCount || 0)} color="blue" />
          <KpiCard label="総トークン" value={formatCompact(totalTokens)} color="purple" />
          <KpiCard label="推定コスト" value={formatCost(estimatedCost)} color="amber" />
          <KpiCard label="コントリビューター数" value={formatNumber(repoInfo?.memberCount || 0)} color="green" />
        </KpiGrid>

        {/* Charts: Daily Activity + Contributor Breakdown */}
        <div className="grid-2">
          <ChartCard title="日別アクティビティ" height={250}>
            <DailyActivityChart data={d.dailyStats} />
          </ChartCard>
          <ChartCard title="コントリビューター内訳" height={250}>
            <ContributorBarChart
              data={d.members.map(m => ({
                name: m.displayName || m.gitEmail,
                tokens: m.totalTokens,
                sessions: m.sessionCount,
              }))}
            />
          </ChartCard>
        </div>

        {/* Branch breakdown with expandable session lists */}
        {d.branches.length > 0 && (
          <ChartCard title={`ブランチ別集計 (${d.branches.length}件)`}>
            <div className="branch-list">
              {d.branches.map((branch) => {
                const branchKey = branch.gitBranch ?? '';
                const isExpanded = expandedBranches.has(branchKey);
                return (
                  <div key={branchKey} className="branch-item">
                    <button
                      className="branch-header"
                      onClick={() => toggleBranch(branchKey)}
                    >
                      <div className="branch-header-left">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <GitBranch size={14} style={{ color: 'var(--accent)' }} />
                        <span className="font-mono" style={{ fontSize: '13px' }}>
                          {branch.gitBranch || '(不明)'}
                        </span>
                      </div>
                      <div className="branch-header-stats">
                        <span className="branch-stat">
                          {formatNumber(branch.sessionCount)} セッション
                        </span>
                        <span className="branch-stat">
                          {formatCompact(calcTotalTokens(branch))} トークン
                        </span>
                      </div>
                    </button>
                    {isExpanded && branch.sessions.length > 0 && (
                      <div className="branch-sessions">
                        <DataTable
                          columns={branchSessionColumns}
                          data={branch.sessions}
                          emptyMessage="セッションデータがありません"
                        />
                      </div>
                    )}
                    {isExpanded && branch.sessions.length === 0 && (
                      <div className="branch-sessions" style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        セッションデータがありません
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* Recent sessions table */}
        {d.recentSessions.length > 0 && (
          <ChartCard title={`最近のセッション (${d.recentSessions.length}件)`}>
            <DataTable
              columns={sessionColumns}
              data={d.recentSessions}
              emptyMessage="セッションデータがありません"
            />
          </ChartCard>
        )}

        {/* Frequent files table */}
        {frequentFiles.length > 0 && (
          <ChartCard title="変更頻度ファイル">
            <DataTable
              columns={fileColumns}
              data={frequentFiles}
              emptyMessage="ファイル変更データがありません"
            />
          </ChartCard>
        )}
      </div>
    </>
  );
}
