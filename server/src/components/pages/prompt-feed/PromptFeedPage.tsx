'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 22;
const GROUP_GAP = 8;
const TIMELINE_LEFT_WIDTH = 260;
const HOUR_MARK_WIDTH = 120; // minimum px per hour

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

      // Group by repo
      const repoMap = new Map<string, PromptFeedItem[]>();
      for (const item of userItems) {
        const repo = item.session.gitRepo || '(no repo)';
        if (!repoMap.has(repo)) repoMap.set(repo, []);
        repoMap.get(repo)!.push(item);
      }

      const repos = Array.from(repoMap.entries()).map(([repoName, repoItems]) => {
        // Group by branch
        const branchMap = new Map<string, PromptFeedItem[]>();
        for (const item of repoItems) {
          const branch = item.session.gitBranch || '(no branch)';
          if (!branchMap.has(branch)) branchMap.set(branch, []);
          branchMap.get(branch)!.push(item);
        }

        const branches = Array.from(branchMap.entries()).map(([branchName, branchItems]) => {
          // Group by session
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
        repos,
      };
    });
  }, [feed.data]);

  // Calculate total rows for height
  const { totalRows, rowMeta } = useMemo(() => {
    const meta: { type: 'user' | 'repo' | 'session'; label: string; color: string; depth: number; sessionId?: number }[] = [];
    for (const group of groups) {
      for (const repo of group.repos) {
        for (const branch of repo.branches) {
          for (const session of branch.sessions) {
            meta.push({
              type: 'session',
              label: `#${session.sessionId}`,
              color: group.userColor,
              depth: 0,
              sessionId: session.sessionId,
            });
          }
        }
      }
    }
    return { totalRows: meta.length, rowMeta: meta };
  }, [groups]);

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
        <div className="timeline-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="timeline-live-dot" style={{
              animation: paused ? 'none' : 'pulse 2s infinite',
              background: paused ? 'var(--text-muted)' : '#22c55e',
            }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {paused ? '一時停止中' : 'ライブ更新中'}
            </span>
            <button className="btn btn-ghost" onClick={() => setPaused(!paused)} style={{ fontSize: '12px' }}>
              {paused ? '▶ 再開' : '⏸ 停止'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>表示期間:</span>
            {HOUR_OPTIONS.map(h => (
              <button
                key={h}
                className={`btn btn-sm ${hours === h ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setHours(h)}
                style={{ fontSize: '12px', padding: '3px 10px' }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        {(!feed.data || feed.data.data.length === 0) ? (
          <NoData message={`過去${hours}時間にプロンプトが見つかりません。`} />
        ) : (
          <div className="timeline-container" ref={scrollRef}>
            {/* Left labels */}
            <div className="timeline-labels" style={{ width: TIMELINE_LEFT_WIDTH }}>
              {/* Header spacer */}
              <div style={{ height: HEADER_HEIGHT + 1, borderBottom: '1px solid var(--border)' }} />

              {groups.map((group, gi) => (
                <div key={group.userEmail} className="timeline-group" style={{ marginTop: gi > 0 ? GROUP_GAP : 0 }}>
                  {group.repos.map((repo) => (
                    repo.branches.map((branch) => (
                      branch.sessions.map((session, si) => (
                        <div key={session.sessionId} className="timeline-label-row" style={{ height: ROW_HEIGHT }}>
                          {si === 0 ? (
                            <div className="timeline-label-content">
                              <span className="timeline-user-dot" style={{ background: group.userColor }} />
                              <span className="timeline-user-name" title={group.userEmail}>
                                {group.userName}
                              </span>
                              <span className="timeline-separator">/</span>
                              <span className="timeline-repo" title={repo.repoName}>
                                {shortRepo(repo.repoName)}
                              </span>
                              <span className="timeline-separator">/</span>
                              <span className="timeline-branch" title={branch.branchName}>
                                {truncate(branch.branchName, 15)}
                              </span>
                            </div>
                          ) : (
                            <div className="timeline-label-content" style={{ paddingLeft: '14px' }}>
                              <span className="timeline-session-label">
                                Session #{session.sessionId}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    ))
                  ))}
                </div>
              ))}
            </div>

            {/* Scrollable timeline area */}
            <div className="timeline-scroll">
              <div className="timeline-canvas" style={{ width: timelineWidth }}>
                {/* Time axis header */}
                <div className="timeline-axis" style={{ height: HEADER_HEIGHT }}>
                  {hourMarks.map(mark => (
                    <div
                      key={mark.label}
                      className="timeline-hour-mark"
                      style={{ left: `${mark.ratio * 100}%` }}
                    >
                      <span>{mark.label}</span>
                    </div>
                  ))}
                  {/* "Now" marker */}
                  <div className="timeline-now-marker" style={{ left: '100%' }}>
                    <span>now</span>
                  </div>
                </div>

                {/* Grid lines + dots */}
                <div className="timeline-body">
                  {/* Vertical grid lines */}
                  {hourMarks.map(mark => (
                    <div
                      key={`grid-${mark.label}`}
                      className="timeline-grid-line"
                      style={{ left: `${mark.ratio * 100}%` }}
                    />
                  ))}

                  {/* Rows */}
                  {(() => {
                    let rowIndex = 0;
                    return groups.map((group, gi) => (
                      <div key={group.userEmail} style={{ marginTop: gi > 0 ? GROUP_GAP : 0 }}>
                        {group.repos.map((repo) => (
                          repo.branches.map((branch) => (
                            branch.sessions.map((session) => {
                              const currentRow = rowIndex++;
                              return (
                                <div
                                  key={session.sessionId}
                                  className="timeline-row"
                                  style={{ height: ROW_HEIGHT }}
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
                                    const width = Math.max(right - left, 0.002);
                                    return (
                                      <div
                                        className="timeline-session-bar"
                                        style={{
                                          left: `${left * 100}%`,
                                          width: `${width * 100}%`,
                                          background: `${group.userColor}15`,
                                          borderColor: `${group.userColor}30`,
                                        }}
                                      />
                                    );
                                  })()}

                                  {/* Prompt dots */}
                                  {session.items.map(item => {
                                    const x = getX(item.promptSubmittedAt!);
                                    return (
                                      <div
                                        key={item.id}
                                        className="timeline-dot"
                                        style={{
                                          left: `${x * 100}%`,
                                          background: group.userColor,
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleDotClick(item); }}
                                        onMouseEnter={(e) => handleDotHover(e, item)}
                                        onMouseLeave={handleDotLeave}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })
                          ))
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="timeline-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="timeline-tooltip-header">
            <ModelBadge model={tooltip.item.model} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {new Date(tooltip.item.promptSubmittedAt!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="timeline-tooltip-body">
            {truncate(tooltip.item.promptText || '', 120)}
          </div>
          <div className="timeline-tooltip-meta">
            <span>{formatCompact(tooltip.item.inputTokens + tooltip.item.outputTokens)} tokens</span>
            {tooltip.item.toolCount > 0 && <span>{tooltip.item.toolCount} tools</span>}
          </div>
          <div className="timeline-tooltip-hint">クリックでセッション詳細へ</div>
        </div>
      )}
    </>
  );
}
