'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { MemberStatsItem } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { formatCost } from '@/lib/formatters';
import './ChartSetup';

export interface MemberCostBarMember {
  gitEmail: string;
  displayName: string | null;
  totalCost: number;
}

interface MemberCostBarChartProps {
  members: MemberCostBarMember[];
  /** Optional cap on number of bars to render (descending). Default: all members. */
  limit?: number;
}

/**
 * メンバー別 累積コストランキング棒グラフ。
 * 主役グラフとして $ 軸でメンバーの利用コストを降順表示する。
 * spec: docs/specs/005-meaningful-charts.md (P5-T1)
 */
export function MemberCostBarChart({ members, limit }: MemberCostBarChartProps) {
  const sorted = useMemo(() => {
    const arr = [...members].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
    return typeof limit === 'number' ? arr.slice(0, limit) : arr;
  }, [members, limit]);

  const labels = sorted.map(m => m.displayName || m.gitEmail);
  const values = sorted.map(m => Number(m.totalCost) || 0);

  const data = {
    labels,
    datasets: [
      {
        label: 'コスト',
        data: values,
        backgroundColor: COLORS.warning + 'cc',
        borderRadius: 4,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `コスト: ${formatCost(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: { callback: v => formatCost(Number(v)) },
            beginAtZero: true,
          },
        },
      }}
    />
  );
}
