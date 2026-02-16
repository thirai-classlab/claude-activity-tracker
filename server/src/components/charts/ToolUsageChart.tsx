'use client';

import { Bar } from 'react-chartjs-2';
import type { ToolStatsItem } from '@/lib/types';
import { TOOL_CATEGORY_COLORS, COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import './ChartSetup';

interface ToolUsageChartProps {
  data: ToolStatsItem[];
  limit?: number;
}

export function ToolUsageChart({ data, limit = 10 }: ToolUsageChartProps) {
  const sorted = [...data].sort((a, b) => b.useCount - a.useCount).slice(0, limit);

  const chartData = {
    labels: sorted.map(t => t.toolName),
    datasets: [
      {
        label: 'Uses',
        data: sorted.map(t => t.useCount),
        backgroundColor: sorted.map(t =>
          TOOL_CATEGORY_COLORS[t.toolCategory] || COLORS.primary
        ),
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
        indexAxis: 'y',
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${formatNumber(ctx.parsed.x)} uses`,
            },
          },
        },
        scales: {
          x: { ticks: { callback: v => formatNumber(Number(v)) } },
          y: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      }}
    />
  );
}
