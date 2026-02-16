'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, FilePlus, FileEdit, FileX, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { KpiGrid } from '@/components/shared/KpiGrid';
import { ChartCard } from '@/components/shared/ChartCard';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { useSessionDetail } from '@/hooks/useApi';
import {
  formatCompact,
  formatCost,
  formatNumber,
  formatDateShort,
  formatSessionDuration as formatSessionDurationShared,
  shortRepo,
  truncate,
} from '@/lib/formatters';
import { totalTokens } from '@/lib/tokenUtils';
import type { TurnDetail, ToolUseDetail, SubagentDetail, FileChangeDetail } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionEvent {
  eventType: string;
  eventSubtype: string | null;
  eventData: unknown;
  occurredAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function opIcon(op: string) {
  const opLower = op.toLowerCase();
  if (opLower.includes('create') || opLower === 'write') return <FilePlus size={13} style={{ color: 'var(--success)' }} />;
  if (opLower.includes('modif') || opLower === 'edit') return <FileEdit size={13} style={{ color: 'var(--warning)' }} />;
  if (opLower.includes('delet') || opLower === 'remove') return <FileX size={13} style={{ color: 'var(--danger)' }} />;
  if (opLower === 'read') return <FileText size={13} style={{ color: 'var(--info)' }} />;
  return <FileText size={13} style={{ color: 'var(--text-muted)' }} />;
}

function opLabel(op: string): string {
  const opLower = op.toLowerCase();
  if (opLower.includes('create') || opLower === 'write') return '作成';
  if (opLower.includes('modif') || opLower === 'edit') return '変更';
  if (opLower.includes('delet') || opLower === 'remove') return '削除';
  if (opLower === 'read') return '読取';
  return op;
}

/** Assign session events to the nearest preceding turn by timestamp */
function assignEventsToTurns(
  turns: TurnDetail[],
  events: SessionEvent[]
): Map<number, SessionEvent[]> {
  const map = new Map<number, SessionEvent[]>();
  if (!events.length || !turns.length) return map;

  // Sort turns by promptSubmittedAt
  const sortedTurns = turns
    .filter(t => t.promptSubmittedAt)
    .map(t => ({ turnNumber: t.turnNumber, time: new Date(t.promptSubmittedAt!).getTime() }))
    .sort((a, b) => a.time - b.time);

  for (const ev of events) {
    const evTime = new Date(ev.occurredAt).getTime();
    // Find the last turn that started before or at this event
    let assigned = sortedTurns[0]?.turnNumber ?? 0;
    for (const t of sortedTurns) {
      if (t.time <= evTime) assigned = t.turnNumber;
      else break;
    }
    if (!map.has(assigned)) map.set(assigned, []);
    map.get(assigned)!.push(ev);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToolUseRow({ tool, isLast }: { tool: ToolUseDetail; isLast: boolean }) {
  const isError = tool.status === 'error';
  const prefix = isLast ? '└─' : '├─';

  return (
    <div className="turn-tool-row">
      <span className="turn-tree-prefix">{prefix}</span>
      <span className="turn-tool-name">{tool.toolName}</span>
      {tool.toolCategory && (
        <span className="turn-tool-category">{tool.toolCategory}</span>
      )}
      {tool.toolInputSummary && (
        <span className="turn-tool-input">{truncate(tool.toolInputSummary, 60)}</span>
      )}
      <span
        className="turn-tool-status"
        style={{ color: isError ? 'var(--danger)' : 'var(--success)' }}
      >
        {isError ? '失敗' : '成功'}
      </span>
      {isError && tool.errorMessage && (
        <div className="turn-tool-error">{truncate(tool.errorMessage, 120)}</div>
      )}
    </div>
  );
}

function SubagentBlock({ sub }: { sub: SubagentDetail }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const subTotalTokens = totalTokens(sub);
  const taskName = sub.description || sub.promptText;

  // Collect file changes from subagent's tool uses
  const subFileChanges = sub.toolUses.flatMap(t => t.fileChanges || []);
  const seen = new Set<string>();
  const uniqueSubFiles = subFileChanges.filter(f => {
    const key = `${f.operation}:${f.filePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hasDetails = sub.toolUses.length > 0 || uniqueSubFiles.length > 0;

  // Build summary badges for accordion
  const detailBadges: { label: string; count: number; color: string }[] = [];
  if (sub.toolUses.length > 0) {
    detailBadges.push({ label: 'ツール', count: sub.toolUses.length, color: 'var(--info)' });
  }
  const fileOpCounts = new Map<string, number>();
  for (const f of uniqueSubFiles) {
    const label = opLabel(f.operation);
    fileOpCounts.set(label, (fileOpCounts.get(label) || 0) + 1);
  }
  for (const [label, count] of fileOpCounts) {
    const color = label === '作成' ? 'var(--success)'
      : label === '変更' ? 'var(--warning)'
      : label === '削除' ? 'var(--danger)'
      : 'var(--text-muted)';
    detailBadges.push({ label, count, color });
  }

  return (
    <div className="turn-subagent">
      <div className="turn-subagent-header">
        <span className="turn-subagent-type">{sub.agentType}</span>
        {sub.agentModel && <ModelBadge model={sub.agentModel} />}
        {sub.durationSeconds != null && (
          <span className="turn-meta-item">{sub.durationSeconds}秒</span>
        )}
        {sub.estimatedCost > 0 && (
          <span className="turn-meta-item">{formatCost(sub.estimatedCost)}</span>
        )}
      </div>
      {taskName && (
        <div className="turn-subagent-desc">{truncate(taskName, 120)}</div>
      )}
      {subTotalTokens > 0 && (
        <div className="turn-token-row">
          <span>入力: {formatCompact(sub.inputTokens)}</span>
          <span>出力: {formatCompact(sub.outputTokens)}</span>
          {sub.cacheReadTokens > 0 && <span>キャッシュ読取: {formatCompact(sub.cacheReadTokens)}</span>}
        </div>
      )}
      {/* Accordion for tool uses + file changes */}
      {hasDetails && (
        <div style={{
          marginTop: '6px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setDetailOpen(!detailOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              background: 'var(--bg-tertiary, rgba(255,255,255,0.02))',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '12px',
            }}
          >
            {detailOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span style={{ fontWeight: 500, fontSize: '11px' }}>詳細</span>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {detailBadges.map((b, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '1px 7px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 500,
                    background: b.color + '18',
                    color: b.color,
                  }}
                >
                  {b.label} {b.count}
                </span>
              ))}
            </div>
          </button>
          {detailOpen && (
            <div style={{ padding: '6px 10px', display: 'flex', gap: '16px' }}>
              {/* Left: Tool uses */}
              {sub.toolUses.length > 0 && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ツール使用 ({sub.toolUses.length})
                  </div>
                  <div className="turn-tools">
                    {sub.toolUses.map((t, i) => (
                      <ToolUseRow
                        key={i}
                        tool={{ ...t, toolInputSummary: null, errorMessage: null }}
                        isLast={i === sub.toolUses.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Right: File changes */}
              {uniqueSubFiles.length > 0 && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ファイル変更 ({uniqueSubFiles.length})
                  </div>
                  {uniqueSubFiles.map((f, i) => {
                    const fileName = f.filePath.split('/').pop() || f.filePath;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '12px' }}>
                        {opIcon(f.operation)}
                        <span style={{ fontWeight: 500 }}>{fileName}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** System event types that are not useful per-turn */
const SYSTEM_EVENT_TYPES = new Set(['turn_duration', 'compact']);

/** Collapsible toggle for file changes + events per turn */
function TurnDetailsToggle({
  fileChanges,
  events,
}: {
  fileChanges: FileChangeDetail[];
  events: SessionEvent[];
}) {
  const [open, setOpen] = useState(false);
  const MAX_EVENTS_DISPLAY = 10;

  // Deduplicate files
  const seen = new Set<string>();
  const uniqueFiles = fileChanges.filter(f => {
    const key = `${f.operation}:${f.filePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter out system-level events that aren't useful per-turn
  const meaningfulEvents = events.filter(ev => !SYSTEM_EVENT_TYPES.has(ev.eventType));

  // Count by operation type
  const opCounts = new Map<string, number>();
  for (const f of uniqueFiles) {
    const label = opLabel(f.operation);
    opCounts.set(label, (opCounts.get(label) || 0) + 1);
  }

  const hasContent = uniqueFiles.length > 0 || meaningfulEvents.length > 0;
  if (!hasContent) return null;

  // Build summary badges
  const summaryBadges: { label: string; count: number; color: string }[] = [];
  for (const [label, count] of opCounts) {
    const color = label === '作成' ? 'var(--success)'
      : label === '変更' ? 'var(--warning)'
      : label === '削除' ? 'var(--danger)'
      : label === '読取' ? 'var(--info)'
      : 'var(--text-muted)';
    summaryBadges.push({ label, count, color });
  }
  if (meaningfulEvents.length > 0) {
    summaryBadges.push({ label: 'イベント', count: meaningfulEvents.length, color: 'var(--info)' });
  }

  return (
    <div style={{
      margin: '6px 0',
      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--bg-tertiary, rgba(255,255,255,0.02))',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '12px',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontWeight: 500 }}>詳細</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {summaryBadges.map((b, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 500,
                background: b.color + '18',
                color: b.color,
              }}
            >
              {b.label} {b.count}
            </span>
          ))}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: '16px' }}>
          {/* Left: File changes */}
          {uniqueFiles.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ファイル変更 ({uniqueFiles.length})
              </div>
              {uniqueFiles.map((f, i) => {
                const fileName = f.filePath.split('/').pop() || f.filePath;
                const dir = f.filePath.substring(0, f.filePath.length - fileName.length);
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 0',
                    fontSize: '12px',
                  }}>
                    {opIcon(f.operation)}
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{dir}</span>
                    <span style={{ fontWeight: 500 }}>{fileName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Right: Events */}
          {meaningfulEvents.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                イベント ({meaningfulEvents.length})
              </div>
              {meaningfulEvents.slice(0, MAX_EVENTS_DISPLAY).map((ev, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 0',
                  fontSize: '12px',
                }}>
                  <Zap size={13} style={{ color: 'var(--info)', flexShrink: 0 }} />
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: 'var(--info, #06b6d4)' + '20',
                    color: 'var(--info, #06b6d4)',
                    fontSize: '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.eventType}
                  </span>
                  {ev.eventSubtype && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {ev.eventSubtype}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof ev.eventData === 'string'
                      ? truncate(ev.eventData, 60)
                      : ev.eventData
                        ? truncate(JSON.stringify(ev.eventData), 60)
                        : ''}
                  </span>
                </div>
              ))}
              {meaningfulEvents.length > MAX_EVENTS_DISPLAY && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 0', fontStyle: 'italic' }}>
                  他 {meaningfulEvents.length - MAX_EVENTS_DISPLAY}件
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TurnCard({
  turn,
  isLast,
  events,
}: {
  turn: TurnDetail;
  isLast: boolean;
  events: SessionEvent[];
}) {
  const mainTokens = totalTokens(turn);
  const mainToolUses = turn.toolUses || [];
  const fileChanges = turn.fileChanges || [];
  const subagents = turn.subagents || [];

  const subagentTokens = subagents.reduce(
    (sum, s) => sum + totalTokens(s),
    0
  );
  const combinedTokens = mainTokens + subagentTokens;

  return (
    <div className={`turn-card ${isLast ? 'last' : ''}`}>
      {/* Turn header */}
      <div className="turn-header">
        <div className="turn-number">ターン {turn.turnNumber}</div>
        <div className="turn-meta">
          {turn.promptSubmittedAt && (
            <span className="turn-meta-item">{formatTime(turn.promptSubmittedAt)}</span>
          )}
          {turn.durationMs != null && (
            <span className="turn-meta-item">{formatDuration(turn.durationMs)}</span>
          )}
          {turn.model && <ModelBadge model={turn.model} />}
          {turn.stopReason && (
            <span className="turn-stop-reason">{turn.stopReason}</span>
          )}
        </div>
      </div>

      {/* Token row — always shown, uniform position */}
      <div className="turn-token-row" style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        fontSize: '12px',
        padding: '4px 10px',
        background: 'var(--bg-secondary, rgba(0,0,0,0.03))',
        borderRadius: '4px',
        margin: '4px 0 8px 0',
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          入力: <strong>{formatCompact(turn.inputTokens)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          出力: <strong>{formatCompact(turn.outputTokens)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          キャッシュ作成: <strong>{formatCompact(turn.cacheCreationTokens)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          キャッシュ読取: <strong>{formatCompact(turn.cacheReadTokens)}</strong>
        </span>
        <span style={{ color: 'var(--text-primary, var(--text-secondary))', fontWeight: 500 }}>
          合計: <strong>{formatCompact(mainTokens)}</strong>
        </span>
        {subagentTokens > 0 && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              サブエージェント: <strong>{formatCompact(subagentTokens)}</strong>
            </span>
            <span style={{ color: 'var(--text-primary, var(--text-secondary))', fontWeight: 500 }}>
              総合計: <strong>{formatCompact(combinedTokens)}</strong>
            </span>
          </>
        )}
      </div>

      {/* Prompt text */}
      {turn.promptText && (
        <div className="turn-prompt">
          <div className="turn-prompt-label">プロンプト</div>
          <div className="turn-prompt-text">{turn.promptText}</div>
        </div>
      )}

      {/* Tool uses */}
      {mainToolUses.length > 0 && (
        <div className="turn-section">
          <div className="turn-section-label">ツール使用 ({mainToolUses.length})</div>
          <div className="turn-tools">
            {mainToolUses.map((t, i) => (
              <ToolUseRow key={i} tool={t} isLast={i === mainToolUses.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* Subagents */}
      {subagents.length > 0 && (
        <div className="turn-section">
          <div className="turn-section-label">サブエージェント ({subagents.length})</div>
          {subagents.map((sub, i) => (
            <SubagentBlock key={i} sub={sub} />
          ))}
        </div>
      )}

      {/* File changes + Events toggle (side by side) */}
      <TurnDetailsToggle fileChanges={fileChanges} events={events} />

      {/* Response text */}
      {turn.responseText && (
        <div className="turn-response">
          <div className="turn-section-label">AI応答</div>
          <div className="turn-response-text">{turn.responseText}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface SessionDetailPageProps {
  sessionId: number;
}

export function SessionDetailPage({ sessionId }: SessionDetailPageProps) {
  const detail = useSessionDetail(sessionId);

  if (detail.isLoading) return <LoadingSpinner />;
  if (detail.error) return <ErrorDisplay retry={() => detail.refetch()} />;
  if (!detail.data) return null;

  const d = detail.data;
  const displayName = d.member?.displayName || d.member?.gitEmail || '不明';
  const title = d.summary || (d.turns[0]?.promptText ? truncate(d.turns[0].promptText, 80) : `セッション #${d.id}`);

  // Compute session total time from turn durations and average turn time
  const sessionTotalMs = d.turns.reduce((sum, t) => sum + (t.durationMs || 0), 0);
  const avgTurnMs = d.turnCount > 0 ? Math.round(sessionTotalMs / d.turnCount) : 0;

  // Assign session events to turns by timestamp
  const eventsByTurn = assignEventsToTurns(d.turns, d.sessionEvents);

  // Collect events not assigned to any turn (before first turn)
  const unassignedEvents = d.sessionEvents.filter(ev => {
    for (const evList of eventsByTurn.values()) {
      if (evList.includes(ev)) return false;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title={title}
        description={`${displayName} · ${d.model || '不明'} · ${shortRepo(d.gitRepo || '')}`}
        breadcrumbs={[
          { label: '概要', href: '/' },
          { label: 'セッション分析', href: '/sessions' },
          { label: `#${d.id}` },
        ]}
      />
      <div className="page-body">
        {/* Session metadata */}
        <div className="session-meta-bar">
          <div className="session-meta-item">
            <span className="session-meta-label">メンバー</span>
            <span>{displayName}</span>
          </div>
          <div className="session-meta-item">
            <span className="session-meta-label">モデル</span>
            {d.model ? <ModelBadge model={d.model} /> : <span>-</span>}
          </div>
          <div className="session-meta-item">
            <span className="session-meta-label">リポジトリ</span>
            <span>{d.gitRepo ? shortRepo(d.gitRepo) : '-'}</span>
          </div>
          {d.gitBranch && (
            <div className="session-meta-item">
              <span className="session-meta-label">ブランチ</span>
              <span className="font-mono" style={{ fontSize: '12px' }}>{d.gitBranch}</span>
            </div>
          )}
          <div className="session-meta-item">
            <span className="session-meta-label">開始</span>
            <span>{formatDateShort(d.startedAt)}</span>
          </div>
          <div className="session-meta-item">
            <span className="session-meta-label">所要時間</span>
            <span>{formatSessionDurationShared(d.durationMs, d.startedAt, d.endedAt)}</span>
          </div>
          {d.endReason && (
            <div className="session-meta-item">
              <span className="session-meta-label">終了理由</span>
              <span>{d.endReason}</span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <KpiGrid>
          <KpiCard
            label="入力トークン"
            value={formatCompact(d.totalInputTokens)}
            sub={d.totalCacheReadTokens > 0 ? `キャッシュ読取: ${formatCompact(d.totalCacheReadTokens)}` : undefined}
            color="blue"
          />
          <KpiCard
            label="出力トークン"
            value={formatCompact(d.totalOutputTokens)}
            sub={`推定コスト: ${formatCost(d.estimatedCost)}`}
            color="purple"
          />
          <KpiCard
            label="ターン数"
            value={formatNumber(d.turnCount)}
            sub={avgTurnMs > 0
              ? `平均ターン時間: ${formatDuration(avgTurnMs)}${d.subagentCount > 0 ? ` / サブエージェント: ${d.subagentCount}` : ''}`
              : d.subagentCount > 0 ? `サブエージェント: ${d.subagentCount}` : undefined}
            color="green"
          />
          <KpiCard
            label="合計ターン時間"
            value={formatDuration(sessionTotalMs > 0 ? sessionTotalMs : null)}
            sub={avgTurnMs > 0 ? `平均: ${formatDuration(avgTurnMs)} / ターン` : undefined}
            color="cyan"
          />
          <KpiCard
            label="ツール使用"
            value={formatNumber(d.toolUseCount)}
            sub={d.errorCount > 0 ? `エラー: ${d.errorCount}件` : undefined}
            color={d.errorCount > 0 ? 'amber' : 'cyan'}
          />
        </KpiGrid>

        {/* Summary */}
        {d.summary && (
          <ChartCard title="サマリー">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {d.summary}
            </div>
          </ChartCard>
        )}

        {/* Turn Timeline */}
        <ChartCard title={`ターンタイムライン (${d.turns.length}件)`}>
          <div className="turn-timeline">
            {d.turns.map((turn, i) => (
              <TurnCard
                key={turn.turnNumber}
                turn={turn}
                isLast={i === d.turns.length - 1}
                events={eventsByTurn.get(turn.turnNumber) || []}
              />
            ))}
            {d.turns.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                ターンデータがありません
              </div>
            )}
          </div>
        </ChartCard>

        {/* Unassigned events (before first turn or no turns) */}
        {unassignedEvents.length > 0 && (
          <ChartCard title={`その他のイベント (${unassignedEvents.length}件)`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0' }}>
              {unassignedEvents.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatTime(ev.occurredAt)}</span>
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: 'var(--info, #06b6d4)' + '20',
                    color: 'var(--info, #06b6d4)',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}>
                    {ev.eventType}
                  </span>
                  {ev.eventSubtype && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{ev.eventSubtype}</span>
                  )}
                </div>
              ))}
            </div>
          </ChartCard>
        )}
      </div>
    </>
  );
}
