'use client';

import Link from 'next/link';
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
import type { TurnDetail, ToolUseDetail, SubagentDetail, FileChangeDetail } from '@/lib/types';

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

// Use shared formatter from @/lib/formatters (imported as formatSessionDurationShared)

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

function opBadge(op: string): { label: string; color: string } {
  const opLower = op.toLowerCase();
  if (opLower.includes('create') || opLower === 'write')
    return { label: '作成', color: 'var(--success)' };
  if (opLower.includes('modif') || opLower === 'edit')
    return { label: '変更', color: 'var(--warning)' };
  if (opLower.includes('delet') || opLower === 'remove')
    return { label: '削除', color: 'var(--danger)' };
  if (opLower === 'read')
    return { label: '読取', color: 'var(--info)' };
  return { label: op, color: 'var(--text-muted)' };
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
  const totalTokens = sub.inputTokens + sub.outputTokens;
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
      {sub.description && (
        <div className="turn-subagent-desc">{truncate(sub.description, 100)}</div>
      )}
      {totalTokens > 0 && (
        <div className="turn-token-row">
          <span>入力: {formatCompact(sub.inputTokens)}</span>
          <span>出力: {formatCompact(sub.outputTokens)}</span>
          {sub.cacheReadTokens > 0 && <span>キャッシュ読取: {formatCompact(sub.cacheReadTokens)}</span>}
        </div>
      )}
      {sub.toolUses.length > 0 && (
        <div className="turn-tools">
          {sub.toolUses.map((t, i) => (
            <ToolUseRow
              key={i}
              tool={{ ...t, toolInputSummary: null, errorMessage: null }}
              isLast={i === sub.toolUses.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileChangesBlock({ files }: { files: FileChangeDetail[] }) {
  // Deduplicate by operation + path
  const seen = new Set<string>();
  const unique = files.filter(f => {
    const key = `${f.operation}:${f.filePath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) return null;

  return (
    <div className="turn-files">
      <div className="turn-section-label">ファイル変更</div>
      {unique.map((f, i) => {
        const { label, color } = opBadge(f.operation);
        const isLast = i === unique.length - 1;
        return (
          <div key={i} className="turn-file-row">
            <span className="turn-tree-prefix">{isLast ? '└─' : '├─'}</span>
            <span className="turn-file-op" style={{ color }}>{label}</span>
            <span className="turn-file-path">{f.filePath}</span>
          </div>
        );
      })}
    </div>
  );
}

function TurnCard({ turn, isLast }: { turn: TurnDetail; isLast: boolean }) {
  const mainTokens = turn.inputTokens + turn.outputTokens;
  const mainToolUses = turn.toolUses || [];
  const fileChanges = turn.fileChanges || [];
  const subagents = turn.subagents || [];

  const subagentTokens = subagents.reduce(
    (sum, s) => sum + s.inputTokens + s.outputTokens,
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
          {combinedTokens > 0 && (
            <span className="turn-meta-item">{formatCompact(combinedTokens)} tokens</span>
          )}
        </div>
      </div>

      {/* Token summary at turn top */}
      {combinedTokens > 0 && (
        <div className="turn-token-summary" style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '12px',
          padding: '6px 10px',
          background: 'var(--bg-secondary, rgba(0,0,0,0.03))',
          borderRadius: '4px',
          margin: '4px 0 8px 0',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            メイン: <strong>{formatCompact(mainTokens)}</strong> tokens
          </span>
          {subagentTokens > 0 && (
            <span style={{ color: 'var(--text-secondary)' }}>
              サブエージェント合計: <strong>{formatCompact(subagentTokens)}</strong> tokens
            </span>
          )}
          {subagentTokens > 0 && (
            <span style={{ color: 'var(--text-primary, var(--text-secondary))' }}>
              合計: <strong>{formatCompact(combinedTokens)}</strong> tokens
            </span>
          )}
        </div>
      )}

      {/* Prompt text */}
      {turn.promptText && (
        <div className="turn-prompt">
          <div className="turn-prompt-label">プロンプト</div>
          <div className="turn-prompt-text">{turn.promptText}</div>
        </div>
      )}

      {/* Model & Stop reason */}
      <div className="turn-info-row">
        {turn.model && <ModelBadge model={turn.model} />}
        {turn.stopReason && (
          <span className="turn-stop-reason">{turn.stopReason}</span>
        )}
      </div>

      {/* Token breakdown */}
      {mainTokens > 0 && (
        <div className="turn-token-row">
          <span>入力: {formatCompact(turn.inputTokens)}</span>
          <span>出力: {formatCompact(turn.outputTokens)}</span>
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

      {/* File changes */}
      {fileChanges.length > 0 && (
        <FileChangesBlock files={fileChanges} />
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
              <TurnCard key={turn.turnNumber} turn={turn} isLast={i === d.turns.length - 1} />
            ))}
            {d.turns.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                ターンデータがありません
              </div>
            )}
          </div>
        </ChartCard>

        {/* Session Events */}
        {d.sessionEvents.length > 0 && (
          <ChartCard title={`セッションイベント (${d.sessionEvents.length}件)`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>種別</th>
                  <th>詳細</th>
                </tr>
              </thead>
              <tbody>
                {d.sessionEvents.map((ev, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {formatTime(ev.occurredAt)}
                    </td>
                    <td>
                      <span className="badge badge-info">{ev.eventType}</span>
                      {ev.eventSubtype && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                          {ev.eventSubtype}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {typeof ev.eventData === 'string'
                        ? truncate(ev.eventData, 100)
                        : ev.eventData
                          ? truncate(JSON.stringify(ev.eventData), 100)
                          : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        )}
      </div>
    </>
  );
}
