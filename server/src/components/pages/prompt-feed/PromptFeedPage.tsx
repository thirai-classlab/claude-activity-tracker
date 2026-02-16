'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Pause, Play, Users, MessageSquare, Clock,
  ChevronDown, ChevronRight, GitBranch, FolderGit2, User,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { NoData } from '@/components/shared/NoData';
import { usePromptFeed } from '@/hooks/useApi';
import { formatCompact, shortRepo, truncate } from '@/lib/formatters';
import { totalTokens } from '@/lib/tokenUtils';
import type { PromptFeedItem } from '@/lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_OPTIONS = [4, 8, 12, 24] as const;
const REFRESH_INTERVAL = 15_000;
const ROW_HEIGHT = 40;
const USER_HEADER_HEIGHT = 44;
const REPO_HEADER_HEIGHT = 36;
const BRANCH_HEADER_HEIGHT = 32;
const HEADER_HEIGHT = 32;
const TIMELINE_LEFT_WIDTH = 360;
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

interface SessionGroup {
  sessionId: number;
  items: PromptFeedItem[];
}

interface BranchGroup {
  branchName: string;
  sessions: SessionGroup[];
  promptCount: number;
}

interface RepoGroup {
  repoName: string;
  branches: BranchGroup[];
  promptCount: number;
}

interface UserGroup {
  userEmail: string;
  userName: string;
  userColor: string;
  promptCount: number;
  repos: RepoGroup[];
}

// ─── Collapse state key helpers ─────────────────────────────────────────────

function userKey(email: string) { return `u:${email}`; }
function repoKey(email: string, repo: string) { return `r:${email}:${repo}`; }
function branchKey(email: string, repo: string, branch: string) { return `b:${email}:${repo}:${branch}`; }

// ─── Main Component ─────────────────────────────────────────────────────────

export function PromptFeedPage() {
  const router = useRouter();
  const [hours, setHours] = useState<number>(8);
  const [paused, setPaused] = useState(false);
  const [tooltip, setTooltip] = useState<{ item: PromptFeedItem; x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const feed = usePromptFeed(undefined, 500, undefined, hours);

  const toggle = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
  const groups = useMemo<UserGroup[]>(() => {
    if (!feed.data?.data) return [];
    const items = feed.data.data;

    const userMap = new Map<string, { name: string; items: PromptFeedItem[] }>();
    for (const item of items) {
      const email = item.member?.gitEmail || 'unknown';
      const name = item.member?.displayName || email;
      if (!userMap.has(email)) userMap.set(email, { name, items: [] });
      userMap.get(email)!.items.push(item);
    }

    return Array.from(userMap.entries()).map(([email, { name, items: userItems }], userIdx) => {
      const repoMap = new Map<string, PromptFeedItem[]>();
      for (const item of userItems) {
        const repo = item.session.gitRepo || '(no repo)';
        if (!repoMap.has(repo)) repoMap.set(repo, []);
        repoMap.get(repo)!.push(item);
      }

      const repos: RepoGroup[] = Array.from(repoMap.entries()).map(([repoName, repoItems]) => {
        const branchMap = new Map<string, PromptFeedItem[]>();
        for (const item of repoItems) {
          const branch = item.session.gitBranch || '(no branch)';
          if (!branchMap.has(branch)) branchMap.set(branch, []);
          branchMap.get(branch)!.push(item);
        }

        const branches: BranchGroup[] = Array.from(branchMap.entries()).map(([branchName, branchItems]) => {
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

          return { branchName, sessions, promptCount: branchItems.length };
        });

        return { repoName, branches, promptCount: repoItems.length };
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
        marks.push({ label: `${t.getHours().toString().padStart(2, '0')}:00`, ratio });
      }
      t.setHours(t.getHours() + 1);
    }
    return marks;
  }, [timeStart, timeEnd, totalMs]);

  const timelineWidth = Math.max(hours * HOUR_MARK_WIDTH, 800);

  const handleDotClick = (item: PromptFeedItem) => {
    router.push(`/sessions/${item.session.id}`);
  };

  const handleDotHover = (e: React.MouseEvent, item: PromptFeedItem) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ item, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleDotLeave = () => setTooltip(null);

  const getDotSize = useCallback((item: PromptFeedItem) => {
    const tokens = totalTokens(item);
    if (tokens > 50000) return 14;
    if (tokens > 10000) return 11;
    if (tokens > 1000) return 9;
    return 7;
  }, []);

  // ─── Build flat row list for synchronized left/right rendering ────────

  type RowEntry =
    | { type: 'user'; group: UserGroup }
    | { type: 'repo'; group: UserGroup; repo: RepoGroup }
    | { type: 'branch'; group: UserGroup; repo: RepoGroup; branch: BranchGroup }
    | { type: 'session'; group: UserGroup; repo: RepoGroup; branch: BranchGroup; session: SessionGroup };

  const rows = useMemo<RowEntry[]>(() => {
    const result: RowEntry[] = [];
    for (const group of groups) {
      result.push({ type: 'user', group });
      if (collapsed.has(userKey(group.userEmail))) continue;

      for (const repo of group.repos) {
        result.push({ type: 'repo', group, repo });
        if (collapsed.has(repoKey(group.userEmail, repo.repoName))) continue;

        for (const branch of repo.branches) {
          result.push({ type: 'branch', group, repo, branch });
          if (collapsed.has(branchKey(group.userEmail, repo.repoName, branch.branchName))) continue;

          for (const session of branch.sessions) {
            result.push({ type: 'session', group, repo, branch, session });
          }
        }
      }
    }
    return result;
  }, [groups, collapsed]);

  function getRowHeight(row: RowEntry): number {
    switch (row.type) {
      case 'user': return USER_HEADER_HEIGHT;
      case 'repo': return REPO_HEADER_HEIGHT;
      case 'branch': return BRANCH_HEADER_HEIGHT;
      case 'session': return ROW_HEIGHT;
    }
  }

  if (feed.isLoading) return <LoadingSpinner />;
  if (feed.error) return <ErrorDisplay retry={() => feed.refetch()} />;

  return (
    <>
      <PageHeader
        title="プロンプトフィード"
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
                ? <><Play size={12} /> Resume</>
                : <><span className="tl-live-pulse" /> LIVE</>
              }
            </button>
            {feed.isFetching && !feed.isLoading && (
              <span className="tl-fetching">updating...</span>
            )}
          </div>
          <div className="tl-controls-right">
            <span className="tl-period-label">Period</span>
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
            <span className="tl-stat-label">prompts</span>
          </div>
          <div className="tl-stat">
            <Users size={14} />
            <span className="tl-stat-value">{stats.users}</span>
            <span className="tl-stat-label">users</span>
          </div>
          <div className="tl-stat">
            <Activity size={14} />
            <span className="tl-stat-value">{stats.sessions}</span>
            <span className="tl-stat-label">sessions</span>
          </div>
          <div className="tl-stat">
            <Clock size={14} />
            <span className="tl-stat-value">{stats.rate}</span>
            <span className="tl-stat-label">/hour</span>
          </div>
        </div>

        {(!feed.data || feed.data.data.length === 0) ? (
          <NoData message={`No prompts found in the past ${hours} hours.`} />
        ) : (
          <div className="tl-container">
            {/* ── Left labels panel ─────────────────────────────── */}
            <div className="tl-labels" style={{ width: TIMELINE_LEFT_WIDTH }}>
              <div className="tl-labels-header" style={{ height: HEADER_HEIGHT }}>
                <span className="tl-labels-header-text">User / Repo / Branch</span>
              </div>

              {rows.map((row, i) => {
                const h = getRowHeight(row);

                if (row.type === 'user') {
                  const isOpen = !collapsed.has(userKey(row.group.userEmail));
                  return (
                    <div
                      key={`u-${row.group.userEmail}`}
                      className="tl-tree-user"
                      style={{ height: h }}
                      onClick={() => toggle(userKey(row.group.userEmail))}
                    >
                      <span className="tl-tree-chevron">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <span className="tl-tree-user-dot" style={{ background: row.group.userColor }} />
                      <User size={14} style={{ color: row.group.userColor, flexShrink: 0 }} />
                      <span className="tl-tree-user-name" title={row.group.userEmail}>
                        {row.group.userName}
                      </span>
                      <span className="tl-tree-badge">{row.group.promptCount}</span>
                    </div>
                  );
                }

                if (row.type === 'repo') {
                  const rk = repoKey(row.group.userEmail, row.repo.repoName);
                  const isOpen = !collapsed.has(rk);
                  return (
                    <div
                      key={`r-${row.group.userEmail}-${row.repo.repoName}`}
                      className="tl-tree-repo"
                      style={{ height: h }}
                      onClick={() => toggle(rk)}
                    >
                      <span className="tl-tree-indent" />
                      <span className="tl-tree-chevron">
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <FolderGit2 size={13} className="tl-tree-repo-icon" />
                      <span className="tl-tree-repo-name" title={row.repo.repoName}>
                        {shortRepo(row.repo.repoName)}
                      </span>
                      <span className="tl-tree-badge-sm">{row.repo.promptCount}</span>
                    </div>
                  );
                }

                if (row.type === 'branch') {
                  const bk = branchKey(row.group.userEmail, row.repo.repoName, row.branch.branchName);
                  const isOpen = !collapsed.has(bk);
                  return (
                    <div
                      key={`b-${row.group.userEmail}-${row.repo.repoName}-${row.branch.branchName}`}
                      className="tl-tree-branch"
                      style={{ height: h }}
                      onClick={() => toggle(bk)}
                    >
                      <span className="tl-tree-indent" />
                      <span className="tl-tree-indent" />
                      <span className="tl-tree-chevron">
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </span>
                      <GitBranch size={12} className="tl-tree-branch-icon" />
                      <span className="tl-tree-branch-name" title={row.branch.branchName}>
                        {truncate(row.branch.branchName, 24)}
                      </span>
                      <span className="tl-tree-badge-sm">{row.branch.promptCount}</span>
                    </div>
                  );
                }

                // session row
                return (
                  <div
                    key={`s-${row.session.sessionId}`}
                    className="tl-tree-session"
                    style={{ height: h }}
                    onClick={() => router.push(`/sessions/${row.session.sessionId}`)}
                  >
                    <span className="tl-tree-indent" />
                    <span className="tl-tree-indent" />
                    <span className="tl-tree-indent" />
                    <span className="tl-tree-session-line" style={{ borderColor: `${row.group.userColor}40` }} />
                    <span className="tl-tree-session-id">#{row.session.sessionId}</span>
                    <span className="tl-tree-session-count">{row.session.items.length} prompts</span>
                    {row.session.items[0] && (
                      <ModelBadge model={row.session.items[0].model} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Scrollable timeline area ──────────────────────── */}
            <div className="tl-scroll" ref={scrollRef}>
              <div className="tl-canvas" style={{ width: timelineWidth }}>
                {/* Time axis header */}
                <div className="tl-axis" style={{ height: HEADER_HEIGHT }}>
                  {hourMarks.map(mark => (
                    <div key={mark.label} className="tl-hour-mark" style={{ left: `${mark.ratio * 100}%` }}>
                      <span>{mark.label}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline body */}
                <div className="tl-body">
                  {/* Grid lines */}
                  {hourMarks.map(mark => (
                    <div key={`g-${mark.label}`} className="tl-grid-line" style={{ left: `${mark.ratio * 100}%` }} />
                  ))}

                  {/* "Now" line */}
                  <div className="tl-now-line" style={{ left: '100%' }}>
                    <span className="tl-now-label">now</span>
                  </div>

                  {/* Rows */}
                  {rows.map((row) => {
                    const h = getRowHeight(row);

                    // Non-session rows: just spacer
                    if (row.type !== 'session') {
                      const cls = row.type === 'user'
                        ? 'tl-body-user'
                        : row.type === 'repo'
                          ? 'tl-body-repo'
                          : 'tl-body-branch';
                      return (
                        <div
                          key={`body-${row.type}-${row.type === 'user' ? row.group.userEmail : row.type === 'repo' ? `${row.group.userEmail}-${row.repo.repoName}` : `${row.group.userEmail}-${row.repo.repoName}-${row.branch.branchName}`}`}
                          className={cls}
                          style={{ height: h }}
                        />
                      );
                    }

                    // Session row: render dots
                    return (
                      <div
                        key={`body-s-${row.session.sessionId}`}
                        className="tl-row"
                        style={{ height: h }}
                        onClick={() => router.push(`/sessions/${row.session.sessionId}`)}
                      >
                        {/* Session span bar */}
                        {(() => {
                          const times = row.session.items
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
                                background: `${row.group.userColor}15`,
                                borderColor: `${row.group.userColor}30`,
                              }}
                            />
                          );
                        })()}

                        {/* Prompt dots */}
                        {row.session.items.map(item => {
                          const x = getX(item.promptSubmittedAt!);
                          const size = getDotSize(item);
                          return (
                            <div
                              key={item.id}
                              className="tl-dot"
                              style={{
                                left: `${x * 100}%`,
                                background: row.group.userColor,
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
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {feed.data && feed.data.data.length > 0 && (
          <div className="tl-legend">
            <span className="tl-legend-title">Dot size (tokens):</span>
            <span className="tl-legend-item"><span className="tl-legend-dot tl-legend-dot--sm" /> &lt;1K</span>
            <span className="tl-legend-item"><span className="tl-legend-dot tl-legend-dot--md" /> 1K-10K</span>
            <span className="tl-legend-item"><span className="tl-legend-dot tl-legend-dot--lg" /> 10K-50K</span>
            <span className="tl-legend-item"><span className="tl-legend-dot tl-legend-dot--xl" /> 50K+</span>
            <span className="tl-legend-sep" />
            <span className="tl-legend-hint">Click dot or row to view session detail</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tl-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
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
            <span>{formatCompact(totalTokens(tooltip.item))} tokens</span>
            {tooltip.item.toolCount > 0 && <span>{tooltip.item.toolCount} tools</span>}
          </div>
        </div>
      )}
    </>
  );
}
