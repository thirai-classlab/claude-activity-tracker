'use client';

import { Line } from 'react-chartjs-2';
import type { DailyStatsItem } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import './ChartSetup';

interface WeeklyTrendChartProps {
  data: DailyStatsItem[];
  metric: 'sessions' | 'tokens' | 'cost';
}

export function WeeklyTrendChart({ data, metric }: WeeklyTrendChartProps) {
  const getValue = (d: DailyStatsItem) => {
    switch (metric) {
      case 'sessions': return d.sessionCount;
      case 'tokens': return d.totalInputTokens + d.totalOutputTokens;
      case 'cost': return d.estimatedCost;
    }
  };

  const labels = {
    sessions: 'Sessions',
    tokens: 'Total Tokens',
    cost: 'Cost ($)',
  };

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [{
      label: labels[metric],
      data: data.map(getValue),
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '20',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2,
    }],
  };

  return (
    <Line
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${metric === 'cost' ? '$' + (ctx.parsed.y ?? 0).toFixed(2) : formatCompact(ctx.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: v => metric === 'cost' ? '$' + Number(v).toFixed(0) : formatCompact(Number(v)),
            },
          },
        },
      }}
    />
  );
}
