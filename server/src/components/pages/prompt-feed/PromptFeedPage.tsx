'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { NoData } from '@/components/shared/NoData';
import { useFilters } from '@/hooks/useFilters';
import { usePromptFeed } from '@/hooks/useApi';
import { formatDateShort, formatDurationMs, formatCompact, truncate, shortRepo } from '@/lib/formatters';
import type { PromptFeedItem } from '@/lib/types';

export function PromptFeedPage() {
  const { filters } = useFilters();
  const [limit, setLimit] = useState(50);
  const [paused, setPaused] = useState(false);
  const feed = usePromptFeed(filters, limit);

  // Auto-refresh every 15 seconds when not paused
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      feed.refetch();
    }, 15000);
    return () => clearInterval(interval);
  }, [paused, feed.refetch]);

  if (feed.isLoading) return <LoadingSpinner />;
  if (feed.error) return <ErrorDisplay retry={() => feed.refetch()} />;
  if (!feed.data || feed.data.data.length === 0) return (
    <>
      <PageHeader
        title="プロンプトフィード"
        description="メンバーのプロンプトをリアルタイム表示"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'プロンプトフィード' }]}
      />
      <div className="page-body">
        <NoData message="選択されたフィルタに該当するプロンプトが見つかりません。" />
      </div>
    </>
  );

  const handleLoadMore = () => {
    setLimit(prev => prev + 30);
  };

  return (
    <>
      <PageHeader
        title="プロンプトフィード"
        description="メンバーのプロンプトをリアルタイム表示"
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'プロンプトフィード' }]}
      />
      <div className="page-body">
        {/* Live status controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: paused ? 'var(--text-muted)' : '#22c55e',
              display: 'inline-block',
              animation: paused ? 'none' : 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {paused ? '一時停止中' : 'ライブ更新中'}
            </span>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setPaused(!paused)}
            style={{ fontSize: '12px' }}
          >
            {paused ? '再開' : '一時停止'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {feed.data.data.map(item => (
            <PromptCard key={item.id} item={item} />
          ))}
        </div>

        {/* Load more button */}
        {feed.data.hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-ghost" onClick={handleLoadMore}>
              もっと読み込む
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PromptCard({ item }: { item: PromptFeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const promptText = item.promptText || '';
  const isLong = promptText.length > 200;

  return (
    <div
      className="card"
      style={{ padding: '14px 20px', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--accent)',
          flexShrink: 0,
        }}>
          {(item.member?.displayName || item.member?.gitEmail || '?')[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>
              {item.member?.displayName || item.member?.gitEmail || '不明'}
            </span>
            <ModelBadge model={item.model} />
            {item.session.gitRepo && (
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-input)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}>
                {shortRepo(item.session.gitRepo)}
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {formatDateShort(item.promptSubmittedAt)}
            </span>
          </div>

          {/* Prompt Text */}
          <div style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: expanded ? 'unset' : 'ellipsis',
          }}>
            {expanded ? promptText : truncate(promptText, 200)}
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {item.toolCount > 0 && <span>{item.toolCount} ツール</span>}
            {item.durationMs && <span>{formatDurationMs(item.durationMs)}</span>}
            <span>{formatCompact(item.inputTokens + item.outputTokens)} トークン</span>
          </div>
        </div>
      </div>
    </div>
  );
}
