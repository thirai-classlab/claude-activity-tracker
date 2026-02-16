'use client';

import { Bar, Line } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import type { DailyStatsItem } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { formatCompact } from '@/lib/formatters';
import { forecastTokens } from '@/lib/regression';
import { totalTokens } from '@/lib/tokenUtils';
import './ChartSetup';

interface TokenForecastChartProps {
  data: DailyStatsItem[];
  forecastDays?: number;
}

export function TokenForecastChart({ data, forecastDays = 7 }: TokenForecastChartProps) {
  const dailyTokens = data.map(d => ({
    date: d.date,
    tokens: totalTokens(d),
  }));

  const forecasts = forecastTokens(dailyTokens, forecastDays);

  const allDates = [
    ...dailyTokens.map(d => d.date),
    ...forecasts.map(f => f.date),
  ];

  const actualData = allDates.map(date => {
    const item = dailyTokens.find(d => d.date === date);
    return item ? item.tokens : null;
  });

  const forecastData = allDates.map(date => {
    const item = forecasts.find(f => f.date === date);
    return item ? item.predicted : null;
  });

  const chartData: ChartData<'bar' | 'line', (number | null)[], string> = {
    labels: allDates,
    datasets: [
      {
        type: 'bar' as const,
        label: '実績',
        data: actualData,
        backgroundColor: COLORS.primary + 'cc',
        borderRadius: 3,
        order: 2,
      },
      {
        type: 'line' as const,
        label: '予測',
        data: forecastData,
        borderColor: COLORS.warning,
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.warning,
        fill: false,
        order: 1,
      },
    ],
  };

  return (
    <Bar
      data={chartData as ChartData<'bar', (number | null)[], string>}
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
          x: { grid: { display: false } },
          y: { ticks: { callback: v => formatCompact(Number(v)) } },
        },
      }}
    />
  );
}
