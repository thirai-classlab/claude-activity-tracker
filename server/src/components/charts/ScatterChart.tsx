'use client';

import { Scatter } from 'react-chartjs-2';
import type { ClassifiedSession } from '@/lib/types';
import { SESSION_CLASSIFICATION_COLORS } from '@/lib/constants';
import { shortModel, formatCompact, formatDuration } from '@/lib/formatters';
import { totalTokens } from '@/lib/tokenUtils';
import './ChartSetup';

interface ScatterChartProps {
  data: ClassifiedSession[];
}

export function SessionScatterChart({ data }: ScatterChartProps) {
  const points = data.map(s => ({
    x: s.turnCount,
    y: totalTokens(s),
    r: Math.max(4, Math.min(20, s.durationMinutes / 5)),
    session: s,
  }));

  const chartData = {
    datasets: [{
      label: 'セッション',
      data: points,
      backgroundColor: points.map(p =>
        SESSION_CLASSIFICATION_COLORS[p.session.classification] + 'aa'
      ),
      borderColor: points.map(p =>
        SESSION_CLASSIFICATION_COLORS[p.session.classification]
      ),
      borderWidth: 1,
      pointRadius: points.map(p => p.r),
    }],
  };

  return (
    <Scatter
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw as typeof points[number];
                const s = raw.session;
                return [
                  `ターン数: ${s.turnCount}`,
                  `トークン: ${formatCompact(totalTokens(s))}`,
                  `所要時間: ${formatDuration(s.durationMinutes * 60)}`,
                  `モデル: ${shortModel(s.model)}`,
                  `分類: ${s.classification}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'ターン数' },
            grid: { color: '#334155' },
          },
          y: {
            title: { display: true, text: '総トークン' },
            ticks: { callback: v => formatCompact(Number(v)) },
          },
        },
      }}
    />
  );
}
