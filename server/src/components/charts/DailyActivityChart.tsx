'use client';

import { Bar } from 'react-chartjs-2';
import { COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import './ChartSetup';

interface DailyActivityChartProps {
  data: { date: string; sessionCount: number; turnCount?: number; totalTokens?: number }[];
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Sessions',
        data: data.map(d => d.sessionCount),
        backgroundColor: COLORS.primary + 'cc',
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
          tooltip: {
            callbacks: {
              label: ctx => `Sessions: ${formatNumber(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true },
        },
      }}
    />
  );
}
