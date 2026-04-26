'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import './ChartSetup';

export interface SmallMultiplesMember {
  gitEmail: string;
  displayName: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
}

interface SmallMultiplesTokensProps {
  members: SmallMultiplesMember[];
}

interface SeriesDef {
  key: 'totalInputTokens' | 'totalOutputTokens' | 'totalCacheCreationTokens' | 'totalCacheReadTokens';
  label: string;
  color: string;
}

const SERIES: readonly SeriesDef[] = [
  { key: 'totalInputTokens', label: '入力トークン', color: COLORS.sonnet },
  { key: 'totalOutputTokens', label: '出力トークン', color: COLORS.opus },
  { key: 'totalCacheCreationTokens', label: 'Cache 作成', color: COLORS.warning },
  { key: 'totalCacheReadTokens', label: 'Cache 読取', color: COLORS.success },
] as const;

/**
 * Small multiples — メンバーごとに 4 種別 (input / output / cache_create / cache_read)
 * を独自 Y 軸スケールの小バーチャートで横並び表示。メンバー順は親が渡した順で固定。
 * spec: docs/specs/005-meaningful-charts.md (P5-T2)
 */
export function SmallMultiplesTokens({ members }: SmallMultiplesTokensProps) {
  const labels = useMemo(
    () => members.map(m => m.displayName || m.gitEmail),
    [members],
  );

  if (members.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
      }}
    >
      {SERIES.map(s => {
        const values = members.map(m => Number(m[s.key]) || 0);
        const data = {
          labels,
          datasets: [
            {
              label: s.label,
              data: values,
              backgroundColor: s.color + 'cc',
              borderRadius: 3,
            },
          ],
        };

        const options: ChartOptions<'bar'> = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: s.label,
              align: 'start',
              padding: { bottom: 4 },
              font: { size: 12, weight: 'bold' },
            },
            tooltip: {
              callbacks: {
                label: ctx => `${s.label}: ${formatCompact(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 30 },
            },
            y: {
              beginAtZero: true,
              ticks: {
                callback: v => formatCompact(Number(v)),
                font: { size: 10 },
              },
            },
          },
        };

        return (
          <div
            key={s.key}
            style={{
              background: 'var(--surface, transparent)',
              borderRadius: '6px',
              padding: '8px',
              height: '220px',
            }}
          >
            <Bar data={data} options={options} />
          </div>
        );
      })}
    </div>
  );
}
