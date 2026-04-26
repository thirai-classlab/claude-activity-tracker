'use client';

import { useMemo, useState } from 'react';
import type { MemberStatsItem, ProductivityMetricsItem } from '@/lib/types';
import { formatCost, formatCompact, formatNumber } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberTokensTableProps {
  members: MemberStatsItem[];
  /** Optional productivity map (keyed by gitEmail) used to surface tool counts. */
  productivity?: Record<string, ProductivityMetricsItem>;
  onRowClick?: (member: MemberStatsItem) => void;
}

type SortKey =
  | 'name'
  | 'cost'
  | 'input'
  | 'output'
  | 'cacheCreate'
  | 'cacheRead'
  | 'turns'
  | 'tools';

type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey;
  header: string;
  align: 'left' | 'right';
}

const COLUMNS: readonly ColumnDef[] = [
  { key: 'name', header: 'メンバー', align: 'left' },
  { key: 'cost', header: '$ コスト', align: 'right' },
  { key: 'input', header: 'input', align: 'right' },
  { key: 'output', header: 'output', align: 'right' },
  { key: 'cacheCreate', header: 'cache_create', align: 'right' },
  { key: 'cacheRead', header: 'cache_read', align: 'right' },
  { key: 'turns', header: 'turns', align: 'right' },
  { key: 'tools', header: 'tools', align: 'right' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function valueFor(
  m: MemberStatsItem,
  key: SortKey,
  productivity: Record<string, ProductivityMetricsItem> | undefined,
): number | string {
  switch (key) {
    case 'name':
      return (m.displayName || m.gitEmail || '').toLowerCase();
    case 'cost':
      return Number(m.estimatedCost) || 0;
    case 'input':
      return Number(m.totalInputTokens) || 0;
    case 'output':
      return Number(m.totalOutputTokens) || 0;
    case 'cacheCreate':
      return Number(m.totalCacheCreationTokens) || 0;
    case 'cacheRead':
      return Number(m.totalCacheReadTokens) || 0;
    case 'turns':
      return Number(m.totalTurns) || 0;
    case 'tools': {
      const p = productivity?.[m.gitEmail];
      return Number(p?.totalToolUses ?? 0);
    }
  }
}

function compare(
  a: MemberStatsItem,
  b: MemberStatsItem,
  key: SortKey,
  productivity: Record<string, ProductivityMetricsItem> | undefined,
): number {
  const av = valueFor(a, key, productivity);
  const bv = valueFor(b, key, productivity);
  if (typeof av === 'number' && typeof bv === 'number') {
    return av - bv;
  }
  return String(av).localeCompare(String(bv));
}

function NumericCell({ raw, formatted }: { raw: number; formatted: string }) {
  return (
    <span
      title={raw.toLocaleString()}
      style={{ fontFamily: 'monospace' }}
    >
      {formatted}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * メンバー × トークン詳細テーブル。すべての列で昇降両方向にソート可能。
 * spec: docs/specs/005-meaningful-charts.md (P5-T3)
 */
export function MemberTokensTable({ members, productivity, onRowClick }: MemberTokensTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('cost');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const sorted = useMemo(() => {
    const arr = [...members];
    arr.sort((a, b) => {
      const c = compare(a, b, sortKey, productivity);
      return direction === 'asc' ? c : -c;
    });
    return arr;
  }, [members, sortKey, direction, productivity]);

  function handleHeaderClick(key: SortKey) {
    if (key === sortKey) {
      setDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection(key === 'name' ? 'asc' : 'desc');
    }
  }

  function arrow(key: SortKey): string {
    if (key !== sortKey) return '';
    return direction === 'asc' ? ' \u2191' : ' \u2193';
  }

  if (members.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        メンバーデータがありません
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {COLUMNS.map(col => (
            <th
              key={col.key}
              onClick={() => handleHeaderClick(col.key)}
              style={{
                textAlign: col.align,
                cursor: 'pointer',
                userSelect: 'none',
              }}
              aria-sort={
                col.key === sortKey
                  ? direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              {col.header}
              <span style={{ color: 'var(--text-muted)' }}>{arrow(col.key)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(m => {
          const tools = productivity?.[m.gitEmail]?.totalToolUses ?? 0;
          const cost = Number(m.estimatedCost) || 0;
          return (
            <tr
              key={m.gitEmail}
              onClick={() => onRowClick?.(m)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              <td style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{m.displayName || m.gitEmail}</div>
                {m.displayName && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {m.gitEmail}
                  </div>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <span
                  title={`$${cost.toFixed(4)}`}
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                >
                  {formatCost(cost)}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell
                  raw={Number(m.totalInputTokens) || 0}
                  formatted={formatCompact(m.totalInputTokens)}
                />
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell
                  raw={Number(m.totalOutputTokens) || 0}
                  formatted={formatCompact(m.totalOutputTokens)}
                />
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell
                  raw={Number(m.totalCacheCreationTokens) || 0}
                  formatted={formatCompact(m.totalCacheCreationTokens)}
                />
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell
                  raw={Number(m.totalCacheReadTokens) || 0}
                  formatted={formatCompact(m.totalCacheReadTokens)}
                />
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell
                  raw={Number(m.totalTurns) || 0}
                  formatted={formatNumber(m.totalTurns)}
                />
              </td>
              <td style={{ textAlign: 'right' }}>
                <NumericCell raw={tools} formatted={formatNumber(tools)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
