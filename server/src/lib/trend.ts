import type { DailyStatsItem, StatsResponse } from './types';

interface WeeklyAgg {
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

/**
 * Split daily stats into current week and previous week aggregates.
 * "Current week" = last 7 days of data, "Previous week" = the 7 days before that.
 */
export function splitWeeks(dailyStats: DailyStatsItem[]): { current: WeeklyAgg; previous: WeeklyAgg } {
  if (dailyStats.length === 0) {
    const empty: WeeklyAgg = { sessions: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 0 };
    return { current: { ...empty }, previous: { ...empty } };
  }

  const sorted = [...dailyStats].sort((a, b) => a.date.localeCompare(b.date));
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const midDate = new Date(lastDate);
  midDate.setDate(midDate.getDate() - 7);
  const startDate = new Date(midDate);
  startDate.setDate(startDate.getDate() - 7);

  const agg = (items: DailyStatsItem[]): WeeklyAgg => ({
    sessions: items.reduce((s, d) => s + d.sessionCount, 0),
    inputTokens: items.reduce((s, d) => s + d.totalInputTokens, 0),
    outputTokens: items.reduce((s, d) => s + d.totalOutputTokens, 0),
    cacheCreationTokens: items.reduce((s, d) => s + (d.totalCacheCreationTokens || 0), 0),
    cacheReadTokens: items.reduce((s, d) => s + (d.totalCacheReadTokens || 0), 0),
    cost: items.reduce((s, d) => s + d.estimatedCost, 0),
  });

  const current = sorted.filter(d => new Date(d.date) > midDate);
  const previous = sorted.filter(d => {
    const date = new Date(d.date);
    return date > startDate && date <= midDate;
  });

  return { current: agg(current), previous: agg(previous) };
}

/**
 * Calculate trend percentage between two values.
 */
export function calcTrend(current: number, previous: number): {
  direction: 'up' | 'down' | 'flat';
  percentage: number;
  label: string;
} {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', percentage: 0, label: '-' };
    return { direction: 'up', percentage: 100, label: '+100%' };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return { direction: 'flat', percentage: 0, label: '±0%' };
  const sign = pct > 0 ? '+' : '';
  return {
    direction: pct > 0 ? 'up' : 'down',
    percentage: pct,
    label: `${sign}${pct.toFixed(1)}%`,
  };
}
