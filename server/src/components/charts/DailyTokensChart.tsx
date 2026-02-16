'use client';

import { Bar } from 'react-chartjs-2';
import type { DailyStatsItem } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import './ChartSetup';

interface DailyTokensChartProps {
  data: DailyStatsItem[];
}

export function DailyTokensChart({ data }: DailyTokensChartProps) {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Input Tokens',
        data: data.map(d => d.totalInputTokens),
        backgroundColor: COLORS.sonnet + 'cc',
        borderRadius: 3,
      },
      {
        label: 'Output Tokens',
        data: data.map(d => d.totalOutputTokens),
        backgroundColor: COLORS.opus + 'cc',
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
          x: {
            stacked: true,
            grid: { display: false },
          },
          y: {
            stacked: true,
            ticks: { callback: v => formatCompact(Number(v)) },
          },
        },
      }}
    />
  );
}
