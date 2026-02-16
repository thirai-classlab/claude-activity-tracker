'use client';

import { Bar } from 'react-chartjs-2';
import type { MemberStatsItem } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import './ChartSetup';

interface MemberTokenBarChartProps {
  data: MemberStatsItem[];
  limit?: number;
}

export function MemberTokenBarChart({ data, limit = 10 }: MemberTokenBarChartProps) {
  const sorted = [...data].sort((a, b) => b.totalTokens - a.totalTokens).slice(0, limit);

  const chartData = {
    labels: sorted.map(m => m.displayName || m.gitEmail),
    datasets: [
      {
        label: '入力',
        data: sorted.map(m => m.totalInputTokens),
        backgroundColor: COLORS.sonnet + 'cc',
        borderRadius: 3,
      },
      {
        label: '出力',
        data: sorted.map(m => m.totalOutputTokens),
        backgroundColor: COLORS.opus + 'cc',
        borderRadius: 3,
      },
      {
        label: 'Cache作成',
        data: sorted.map(m => m.totalCacheCreationTokens ?? 0),
        backgroundColor: COLORS.warning + 'cc',
        borderRadius: 3,
      },
      {
        label: 'Cache読取',
        data: sorted.map(m => m.totalCacheReadTokens ?? 0),
        backgroundColor: COLORS.success + 'cc',
        borderRadius: 3,
      },
    ],
  };

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' as const, align: 'end' as const },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${formatCompact(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { callback: v => formatCompact(Number(v)) } },
        },
      }}
    />
  );
}
