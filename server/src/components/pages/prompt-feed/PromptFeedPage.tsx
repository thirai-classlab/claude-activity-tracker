'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Pause, Play, Users, MessageSquare, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { NoData } from '@/components/shared/NoData';
import { usePromptFeed } from '@/hooks/useApi';
import { formatCompact, shortRepo, truncate } from '@/lib/formatters';
import type { PromptFeedItem } from '@/lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_OPTIONS = [4, 8, 12, 24] as const;
const REFRESH_INTERVAL = 15_000;
const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 28;
const USER_HEADER_HEIGHT = 24;
const GROUP_GAP = 2;
const TIMELINE_LEFT_WIDTH = 280;
const HOUR_MARK_WIDTH = 120;

// ─── Color palette for users ────────────────────────────────────────────────

const USER_COLORS = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineGroup {
  userEmail: string;
  userName: string;
  userColor: string;
  promptCount: number;
  repos: {
    repoName: string;
    branches: {
      branchName: string;
      sessions: {
        sessionId: number;
        items: PromptFeedItem[];
      }[];
    }[];
  }[];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PromptFeedPage() {
  const router = useRouter();
  const [hours, setHours] = useState<number>(8);
  const [paused, setPaused] = useState(false);
  const [tooltip, setTooltip] = useState<{ item: PromptFeedItem; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const feed = usePromptFeed(undefined, 500, undefined, hours);

  // Auto-refresh
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => feed.refetch(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [paused, feed.refetch]);

  // Scroll to right (now) on load
  useEffect(() => {
    if (scrollRef.current && feed.data?.data?.length) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [feed.data]);

  // Time range
  const { timeStart, timeEnd, totalMs } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return { timeStart: start, timeEnd: end, totalMs: hours * 60 * 60 * 1000 };
  }, [hours, feed.dataUpdatedAt]);

  // Group data: User → Repo → Branch → Session
  const groups = useMemo<TimelineGroup[]>(() => {
    if (!feed.data?.data) return [];
    const items = feed.data.data;

    const userMap = new Map<string, { name: string; items: PromptFeedItem[] }>();
    for (const item of items) {
      const email = item.member?.gitEmail || 'unknown';
      const name = item.member?.displayName || email;
      if (!userMap.has(email)) userMap.set(email, { name, items: [] });
      userMap.get(email)!.items.push(item);
    }

    const userEmails = Array.from(userMap.keys());

    return userEmails.map((email, userIdx) => {
      const { name, items: userItems } = userMap.get(email)!;

      const repoMap = new Map<string, PromptFeedItem[]>();
      for (const item of userItems) {
        const repo = item.session.gitRepo || '(no repo)';
        if (!repoMap.has(repo)) repoMap.set(repo, []);
        repoMap.get(repo)!.push(item);
      }

      const repos = Array.from(repoMap.entries()).map(([repoName, repoItems]) => {
        const branchMap = new Map<string, PromptFeedItem[]>();
        for (const item of repoItems) {
          const branch = item.session.gitBranch || '(no branch)';
          if (!branchMap.has(branch)) branchMap.set(branch, []);
          branchMap.get(branch)!.push(item);
        }

        const branches = Array.from(branchMap.entries()).map(([branchName, branchItems]) => {
          const sessionMap = new Map<number, PromptFeedItem[]>();
          for (const item of branchItems) {
            const sid = item.session.id;
            if (!sessionMap.has(sid)) sessionMap.set(sid, []);
            sessionMap.get(sid)!.push(item);
          }

          const sessions = Array.from(sessionMap.entries()).map(([sessionId, sItems]) => ({
            sessionId,
            items: sItems.sort((a, b) =>
              new Date(a.promptSubmittedAt!).getTime() - new Date(b.promptSubmittedAt!).getTime()
            ),
          }));

          return { branchName, sessions };
        });

        return { repoName, branches };
      });

      return {
        userEmail: email,
        userName: name,
        userColor: getUserColor(userIdx),
        promptCount: userItems.length,
        repos,
      };
    });
  }, [feed.data]);

  // Summary stats
  const stats = useMemo(() => {
    if (!feed.data?.data) return { total: 0, users: 0, sessions: 0, rate: '0' };
    const items = feed.data.data;
    const uniqueUsers = new Set(items.map(i => i.member?.gitEmail)).size;
    const uniqueSessions = new Set(items.map(i => i.session.id)).size;
    const rate = hours > 0 ? (items.length / hours).toFixed(1) : '0';
    return { total: items.length, users: uniqueUsers, sessions: uniqueSessions, rate };
  }, [feed.data, hours]);

  // Position calculation
  const getX = useCallback((dateStr: string) => {
    const t = new Date(dateStr).getTime();
    const ratio = (t - timeStart.getTime()) / totalMs;
    return Math.max(0, Math.min(1, ratio));
  }, [timeStart, totalMs]);

  // Hour marks
  const hourMarks = useMemo(() => {
    const marks: { label: string; ratio: number }[] = [];
    const startHour = new Date(timeStart);
    startHour.setMinutes(0, 0, 0);
    if (startHour.getTime() < timeStart.getTime()) {
      startHour.setHours(startHour.getHours() + 1);
    }

    const t = new Date(startHour);
    while (t.getTime() <= timeEnd.getTime()) {
      const ratio = (t.getTime() - timeStart.getTime()) / totalMs;
      if (ratio >= 0 && ratio <= 1) {
        marks.push({
          label: `${t.getHours().toString().padStart(2, '0')}:00`,
          ratio,
        });
      }
      t.setHours(t.getHours() + 1);
    }
    return marks;
  }, [timeStart, timeEnd, totalMs]);

  // Timeline width
  const timelineWidth = Math.max(hours * HOUR_MARK_WIDTH, 800);

  // Handle dot click → navigate to session detail
  const handleDotClick = (item: PromptFeedItem) => {
    router.push(`/sessions/${item.session.id}`);
  };

  // Tooltip handlers
  const handleDotHover = (e: React.MouseEvent, item: PromptFeedItem) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleDotLeave = () => setTooltip(null);

  // Dot size based on token count
  const getDotSize = useCallback((item: PromptFeedItem) => {
    const tokens = item.inputTokens + item.outputTokens;
    if (tokens > 50000) return 12;
    if (tokens > 10000) return 10;
    if (tokens > 1000) return 8;
    return 6;
  }, []);

  if (feed.isLoading) return <LoadingSpinner />;
  if (feed.error) return <ErrorDisplay retry={() => feed.refetch()} />;

  return (
    <>
      <PageHeader
        title="リアルタイムプロンプトフィード"
        description={`過去${hours}時間のプロンプトをタイムライン表示`}
        breadcrumbs={[{ label: '概要', href: '/' }, { label: 'プロンプトフィード' }]}
      />
      <div className="page-body">
        {/* Controls */}
        <div className="tl-controls">
          <div className="tl-controls-left">
            <button
              className={`tl-live-btn ${paused ? 'tl-live-btn--paused' : ''}`}
              onClick={() => setPaused(!paused)}
            >
              {paused
                ? <><Play size={12} /> 再開</>
                : <><span className="tl-live-pulse" /> ライブ</>
              }
            </button>
            {feed.isFetching && !feed.isLoading && (
              <span className="tl-fetching">更新中...</span>
            )}
          </div>
          <div className="tl-controls-right">
            <span className="tl-period-label">期間</span>
            <div className="tl-period-tabs">
              {HOUR_OPTIONS.map(h => (
                <button
                  key={h}
                  className={`tl-period-tab ${hours === h ? 'tl-period-tab--active' : ''}`}
                  onClick={() => setHours(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="tl-stats">
          <div className="tl-stat">
            <MessageSquare size={14} />
            <span className="tl-stat-value">{stats.total}</span>
            <span className="tl-stat-label">プロンプト</span>
          </div>
          <div className="tl-stat">
            <Users size={14} />
            <span className="tl-stat-value">{stats.users}</span>
            <span className="tl-stat-label">アクティブ</span>
          </div>
          <div className="tl-stat">
            <Activity size={14} />
            <span className="tl-stat-value">{stats.sessions}</span>
            <span className="tl-stat-label">セッション</span>
          </div>
          <div className="tl-stat">
            <Clock size={14} />
            <span className="tl-stat-value">{stats.rate}</span>
            <span className="tl-stat-label">件/時</span>
          </div>
        </div>

        {(!feed.data || feed.data.data.length === 0) ? (
          <NoData message={`過去${hours}時間にプロンプトが見つかりません。`} />
        ) : (
          <div className="tl-container">
            {/* Left labels */}
            <div className="tl-labels" style={{ width: TIMELINE_LEFT_WIDTH }}>
              {/* Header spacer */}
              <div className="tl-labels-header" style={{ height: HEADER_HEIGHT }} />

              {groups.map((group, gi) => (
                <div key={group.userEmail} className="tl-group">
                  {/* User header row */}
                  <div className="tl-user-header" style={{ height: USER_HEADER_HEIGHT }}>
                    <span className="tl-user-dot" style={{ background: group.userColor }} />
                    <span className="tl-user-name" title={group.userEmail}>
                      {group.userName}
                    </span>
                    <span className="tl-user-count">{group.promptCount}</span>
                  </div>

                  {/* Session rows */}
                  {group.repos.map((repo) => (
                    repo.branches.map((branch) => (
                      branch.sessions.map((session) => (
                        <div key={session.sessionId} className="tl-label-row" style={{ height: ROW_HEIGHT }}>
                          <div className="tl-label-content">
                            <span className="tl-label-indent" style={{ borderColor: `${group.userColor}40` }} />
                            <span className="tl-repo" title={repo.repoName}>
                              {shortRepo(repo.repoName)}
                            </span>
                            <span className="tl-separator">/</span>
                            <span className="tl-branch" title={branch.branchName}>
                              {truncate(branch.branchName, 12)}
                            </span>
                            <span className="tl-session-id">#{session.sessionId}</span>
                          </div>
                        </div>
                      ))
                    ))
                  ))}
                </div>
              ))}
            </div>

            {/* Scrollable timeline area */}
            <div className="tl-scroll" ref={scrollRef}>
              <div className="tl-canvas" style={{ width: timelineWidth }}>
                {/* Time axis header */}
                <div className="tl-axis" style={{ height: HEADER_HEIGHT }}>
                  {hourMarks.map(mark => (
                    <div
                      key={mark.label}
                      className="tl-hour-mark"
                      style={{ left: `${mark.ratio * 100}%` }}
                    >
                      <span>{mark.label}</span>
                    </div>
                  ))}
                </div>

                {/* Grid lines + dots */}
                <div className="tl-body">
                  {/* Vertical grid lines */}
                  {hourMarks.map(mark => (
                    <div
                      key={`grid-${mark.label}`}
                      className="tl-grid-line"
                      style={{ left: `${mark.ratio * 100}%` }}
                    />
                  ))}

                  {/* "Now" line spanning full height */}
                  <div className="tl-now-line" style={{ left: '100%' }}>
                    <span className="tl-now-label">now</span>
                  </div>

                  {/* Rows */}
                  {groups.map((group) => (
                    <div key={group.userEmail} className="tl-group-rows">
                      {/* Spacer for user header */}
                      <div style={{ height: USER_HEADER_HEIGHT }} />

                      {group.repos.map((repo) => (
                        repo.branches.map((branch) => (
                          branch.sessions.map((session) => (
                            <div
                              key={session.sessionId}
                              className="tl-row"
                              style={{ height: ROW_HEIGHT }}
                              onClick={() => router.push(`/sessions/${session.sessionId}`)}
                            >
                              {/* Session span bar */}
                              {(() => {
                                const times = session.items
                                  .map(it => new Date(it.promptSubmittedAt!).getTime())
                                  .filter(t => t >= timeStart.getTime());
                                if (times.length === 0) return null;
                                const minT = Math.min(...times);
                                const maxT = Math.max(...times);
                                const left = (minT - timeStart.getTime()) / totalMs;
                                const right = (maxT - timeStart.getTime()) / totalMs;
                                const width = Math.max(right - left, 0.003);
                                return (
                                  <div
                                    className="tl-session-bar"
                                    style={{
                                      left: `${left * 100}%`,
                                      width: `${width * 100}%`,
                                      background: `${group.userColor}12`,
                                      borderColor: `${group.userColor}25`,
                                    }}
                                  />
                                );
                              })()}

                              {/* Prompt dots */}
                              {session.items.map(item => {
                                const x = getX(item.promptSubmittedAt!);
                                const size = getDotSize(item);
                                return (
                                  <div
                                    key={item.id}
                                    className="tl-dot"
                                    style={{
                                      left: `${x * 100}%`,
                                      background: group.userColor,
                                      width: size,
                                      height: size,
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleDotClick(item); }}
                                    onMouseEnter={(e) => handleDotHover(e, item)}
                                    onMouseLeave={handleDotLeave}
                                  />
                                );
                              })}
                            </div>
                          ))
                        ))
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {feed.data && feed.data.data.length > 0 && (
          <div className="tl-legend">
            <span className="tl-legend-title">ドットサイズ:</span>
            <span className="tl-legend-item">
              <span className="tl-legend-dot tl-legend-dot--sm" /> &lt;1K
            </span>
            <span className="tl-legend-item">
              <span className="tl-legend-dot tl-legend-dot--md" /> 1K-10K
            </span>
            <span className="tl-legend-item">
              <span className="tl-legend-dot tl-legend-dot--lg" /> 10K-50K
            </span>
            <span className="tl-legend-item">
              <span className="tl-legend-dot tl-legend-dot--xl" /> 50K+
            </span>
            <span className="tl-legend-sep" />
            <span className="tl-legend-hint">クリックでセッション詳細へ</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tl-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tl-tooltip-header">
            <ModelBadge model={tooltip.item.model} />
            <span className="tl-tooltip-time">
              {new Date(tooltip.item.promptSubmittedAt!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="tl-tooltip-body">
            {truncate(tooltip.item.promptText || '', 120)}
          </div>
          <div className="tl-tooltip-meta">
            <span>{formatCompact(tooltip.item.inputTokens + tooltip.item.outputTokens)} tokens</span>
            {tooltip.item.toolCount > 0 && <span>{tooltip.item.toolCount} tools</span>}
          </div>
        </div>
      )}
    </>
  );
}
