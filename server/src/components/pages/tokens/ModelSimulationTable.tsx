'use client';

import { COST_RATES } from '@/lib/constants';
import { formatCost, formatCompact } from '@/lib/formatters';

interface ModelSimulationTableProps {
  totalTokens: number;
  currentCost: number;
  sessions: number;
}

export function ModelSimulationTable({ totalTokens, currentCost, sessions }: ModelSimulationTableProps) {
  // Scenarios: different Opus ratios
  const scenarios = [
    { label: 'Sonnet 100%', opusRatio: 0, sonnetRatio: 1.0 },
    { label: 'Opus 20%', opusRatio: 0.2, sonnetRatio: 0.8 },
    { label: 'Opus 40%', opusRatio: 0.4, sonnetRatio: 0.6 },
    { label: 'Opus 60%', opusRatio: 0.6, sonnetRatio: 0.4 },
    { label: 'Opus 80%', opusRatio: 0.8, sonnetRatio: 0.2 },
    { label: 'Opus 100%', opusRatio: 1.0, sonnetRatio: 0 },
  ];

  // Assume 50/50 input/output split for simulation
  const inputTokens = totalTokens * 0.5;
  const outputTokens = totalTokens * 0.5;
  const daysInData = Math.max(sessions > 0 ? 7 : 1, 7);
  const dailyMultiplier = 30 / daysInData;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>シナリオ</th>
          <th style={{ textAlign: 'right' }}>Opus比率</th>
          <th style={{ textAlign: 'right' }}>Sonnet比率</th>
          <th style={{ textAlign: 'right' }}>月間予測コスト</th>
          <th style={{ textAlign: 'right' }}>現在比</th>
        </tr>
      </thead>
      <tbody>
        {scenarios.map(sc => {
          const opusInput = inputTokens * sc.opusRatio;
          const opusOutput = outputTokens * sc.opusRatio;
          const sonnetInput = inputTokens * sc.sonnetRatio;
          const sonnetOutput = outputTokens * sc.sonnetRatio;

          const cost = (
            (opusInput / 1_000_000) * COST_RATES.opus.input +
            (opusOutput / 1_000_000) * COST_RATES.opus.output +
            (sonnetInput / 1_000_000) * COST_RATES.sonnet.input +
            (sonnetOutput / 1_000_000) * COST_RATES.sonnet.output
          ) * dailyMultiplier;

          const monthlyCurrent = currentCost * dailyMultiplier;
          const diff = monthlyCurrent > 0 ? ((cost - monthlyCurrent) / monthlyCurrent * 100) : 0;

          return (
            <tr key={sc.label}>
              <td style={{ fontWeight: 600 }}>{sc.label}</td>
              <td style={{ textAlign: 'right' }}>{(sc.opusRatio * 100).toFixed(0)}%</td>
              <td style={{ textAlign: 'right' }}>{(sc.sonnetRatio * 100).toFixed(0)}%</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                {formatCost(cost)}
              </td>
              <td style={{
                textAlign: 'right',
                color: diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: 600,
              }}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
