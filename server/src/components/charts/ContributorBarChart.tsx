'use client';

import { Bar } from 'react-chartjs-2';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import './ChartSetup';

interface ContributorBarChartProps {
  data: { name: string; tokens: number; sessions: number }[];
}

export function ContributorBarChart({ data }: ContributorBarChartProps) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      label: 'Tokens',
      data: data.map(d => d.tokens),
      backgroundColor: COLORS.chart.slice(0, data.length),
      borderRadius: 3,
    }],
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
              label: ctx => {
                const item = data[ctx.dataIndex];
                return [`Tokens: ${formatCompact(ctx.parsed.y)}`, `Sessions: ${item.sessions}`];
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: v => formatCompact(Number(v)) } },
        },
      }}
    />
  );
}
