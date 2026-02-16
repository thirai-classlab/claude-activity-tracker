'use client';

import type { HeatmapItem } from '@/lib/types';
import { DAY_LABELS } from '@/lib/constants';

interface HeatmapTableProps {
  data: HeatmapItem[];
}

export function HeatmapTable({ data }: HeatmapTableProps) {
  // Build 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCount = 0;

  for (const item of data) {
    const day = item.dayOfWeek;
    const hour = item.hour;
    if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
      grid[day][hour] = item.count;
      maxCount = Math.max(maxCount, item.count);
    }
  }

  const getColor = (count: number) => {
    if (count === 0) return 'transparent';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    return `rgba(59, 130, 246, ${0.1 + intensity * 0.7})`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', color: 'var(--text-muted)', textAlign: 'left' }} />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} style={{
                padding: '4px 2px',
                color: 'var(--text-muted)',
                fontWeight: 500,
                textAlign: 'center',
                minWidth: '22px',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_LABELS.map((label, day) => (
            <tr key={day}>
              <td style={{
                padding: '4px 8px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                {label}
              </td>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = grid[day][hour];
                return (
                  <td key={hour} style={{ padding: '2px' }}>
                    <div
                      title={`${label} ${hour}:00 - ${count} sessions`}
                      style={{
                        width: '100%',
                        height: '18px',
                        borderRadius: '3px',
                        background: getColor(count),
                        border: count > 0 ? 'none' : '1px solid var(--border)',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
