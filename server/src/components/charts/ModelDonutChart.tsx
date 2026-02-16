'use client';

import { Doughnut } from 'react-chartjs-2';
import { MODEL_COLORS } from '@/lib/constants';
import { shortModel, formatCompact } from '@/lib/formatters';
import './ChartSetup';

interface ModelDonutChartProps {
  data: { model: string; value: number }[];
  label?: string;
}

export function ModelDonutChart({ data, label = 'セッション' }: ModelDonutChartProps) {
  const chartData = {
    labels: data.map(d => shortModel(d.model)),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map(d => {
        const key = d.model.includes('opus') ? 'opus'
          : d.model.includes('sonnet') ? 'sonnet'
          : d.model.includes('haiku') ? 'haiku'
          : 'sonnet';
        return MODEL_COLORS[key] || '#64748b';
      }),
      borderWidth: 0,
    }],
  };

  return (
    <Doughnut
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom' as const },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${formatCompact(ctx.parsed)} ${label}`,
            },
          },
        },
      }}
    />
  );
}
