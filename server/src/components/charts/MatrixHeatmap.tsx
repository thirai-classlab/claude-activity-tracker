'use client';

import { useMemo } from 'react';
import { formatCompact, formatNumber } from '@/lib/formatters';

interface MatrixHeatmapProps<T> {
  data: T[];
  rowKey: keyof T;
  colKey: keyof T;
  valueKey: keyof T;
  /** Optional secondary value key (e.g. sessionCount alongside turnCount) */
  secondaryKey?: keyof T;
  /** Optional tertiary value key (e.g. turnCount) */
  tertiaryKey?: keyof T;
  /** RGB array for cell coloring, e.g. [59, 130, 246] */
  color?: [number, number, number];
  /** Label for the primary value (e.g. "tokens") */
  unitLabel?: string;
  /** Label for the secondary value (e.g. "sessions") */
  secondaryLabel?: string;
  /** Label for the tertiary value (e.g. "turns") */
  tertiaryLabel?: string;
  /** Formatter for primary values */
  valueFmt?: (v: number) => string;
  /** Formatter for secondary values */
  secondaryFmt?: (v: number) => string;
  /** Formatter for tertiary values */
  tertiaryFmt?: (v: number) => string;
  /** Transform row label for display */
  labelFn?: (v: string) => string;
}

export function MatrixHeatmap<T>({
  data,
  rowKey,
  colKey,
  valueKey,
  secondaryKey,
  tertiaryKey,
  color = [59, 130, 246],
  unitLabel = '',
  secondaryLabel = '',
  tertiaryLabel = '',
  valueFmt = formatCompact,
  secondaryFmt = formatNumber,
  tertiaryFmt = formatNumber,
  labelFn = (v) => v,
}: MatrixHeatmapProps<T>) {
  const { rows, dates, grid, grid2, grid3, maxVal, minVal } = useMemo(() => {
    const rowSet = new Set<string>();
    const dateSet = new Set<string>();
    const g: Record<string, number> = {};
    const g2: Record<string, number> = {};
    const g3: Record<string, number> = {};
    let max = 0;
    let min = Infinity;

    for (const d of data) {
      const r = String(d[rowKey] || 'unknown');
      let c = String(d[colKey] || '');
      if (c.includes('T')) c = c.split('T')[0];
      const v = Number(d[valueKey]) || 0;

      rowSet.add(r);
      dateSet.add(c);
      const key = `${r}||${c}`;
      g[key] = (g[key] || 0) + v;
      if (g[key] > max) max = g[key];
      if (g[key] > 0 && g[key] < min) min = g[key];

      if (secondaryKey) {
        g2[key] = (g2[key] || 0) + (Number(d[secondaryKey]) || 0);
      }
      if (tertiaryKey) {
        g3[key] = (g3[key] || 0) + (Number(d[tertiaryKey]) || 0);
      }
    }

    return {
      rows: Array.from(rowSet),
      dates: Array.from(dateSet).sort(),
      grid: g,
      grid2: g2,
      grid3: g3,
      maxVal: max,
      minVal: min === Infinity ? 0 : min,
    };
  }, [data, rowKey, colKey, valueKey, secondaryKey, tertiaryKey]);

  if (data.length === 0 || rows.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        データがありません
      </div>
    );
  }

  const shortDate = (d: string) => {
    const iso = d.split('T')[0];
    const parts = iso.split('-');
    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
  };

  const rgb = color.join(',');

  return (
    <div className="matrix-heatmap" style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }} />
            {dates.map(d => (
              <th key={d} style={{
                padding: '4px 2px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontWeight: 500,
                fontSize: '10px',
                whiteSpace: 'nowrap',
              }}>
                {shortDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r}>
              <td style={{
                padding: '4px 8px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }} title={r}>
                {labelFn(r)}
              </td>
              {dates.map(d => {
                const key = `${r}||${d}`;
                const val = grid[key] || 0;
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const alpha = val === 0 ? '0.03' : (0.12 + intensity * 0.88).toFixed(2);
                const bg = `rgba(${rgb},${alpha})`;
                let title = `${labelFn(r)} / ${d}`;
                if (val > 0) {
                  const parts: string[] = [];
                  parts.push(`${unitLabel}: ${valueFmt(val)}`);
                  if (secondaryKey) {
                    parts.push(`${secondaryLabel}: ${secondaryFmt(grid2[key] || 0)}`);
                  }
                  if (tertiaryKey) {
                    parts.push(`${tertiaryLabel}: ${tertiaryFmt(grid3[key] || 0)}`);
                  }
                  title += '\n' + parts.join('\n');
                }
                return (
                  <td key={d} style={{ padding: '1px' }}>
                    <div
                      title={title}
                      style={{
                        width: '100%',
                        minWidth: '28px',
                        height: '24px',
                        borderRadius: '3px',
                        backgroundColor: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                      }}
                    >
                      {val > 0 && (
                        <span style={{ fontSize: '9px', opacity: 0.8, color: 'var(--text-primary)' }}>
                          {valueFmt(val)}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '8px',
        justifyContent: 'flex-end',
        fontSize: '10px',
        color: 'var(--text-muted)',
      }}>
        <span>少</span>
        {[0.1, 0.3, 0.55, 0.8, 1.0].map(a => (
          <span
            key={a}
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '2px',
              backgroundColor: `rgba(${rgb},${a.toFixed(2)})`,
            }}
          />
        ))}
        <span>多</span>
        <span style={{ marginLeft: '8px' }}>
          | min: {valueFmt(minVal)} / max: {valueFmt(maxVal)} {unitLabel}
        </span>
      </div>
    </div>
  );
}
