'use client';

import { useMemo } from 'react';
import { formatCost } from '@/lib/formatters';
import { useModels } from '@/hooks/useApi';
import type { ModelInfo } from '@/lib/types';

// Local fallback used only while `/api/dashboard/models` is loading or errors.
// The SSOT is `server/src/services/pricingRepository.ts` (spec 002). Values here
// match the current `opus` / `sonnet` standard-tier defaults in that registry.
const PRICING_FALLBACK = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
} as const;

interface Rates {
  input: number;
  output: number;
}

interface PricingView {
  opus: Rates;
  sonnet: Rates;
}

// Preferred model IDs to pick representative rates for each family.
// If the preferred id is missing, fall back to the first non-deprecated
// standard-tier row of that family, and finally to `PRICING_FALLBACK`.
const PREFERRED_MODEL_IDS = {
  opus: 'claude-opus-4-7',
  sonnet: 'claude-sonnet-4-6',
} as const;

function pickFamilyRates(
  models: readonly ModelInfo[],
  family: keyof typeof PREFERRED_MODEL_IDS,
): Rates {
  const preferred = models.find(m => m.modelId === PREFERRED_MODEL_IDS[family]);
  if (preferred) {
    return { input: preferred.inputPerMtok, output: preferred.outputPerMtok };
  }

  const fallbackRow = models.find(
    m => m.family === family && m.tier === 'standard' && !m.deprecated,
  );
  if (fallbackRow) {
    return { input: fallbackRow.inputPerMtok, output: fallbackRow.outputPerMtok };
  }

  return PRICING_FALLBACK[family];
}

interface ModelSimulationTableProps {
  totalTokens: number;
  currentCost: number;
  sessions: number;
}

export function ModelSimulationTable({ totalTokens, currentCost, sessions }: ModelSimulationTableProps) {
  const { data, isLoading, isError } = useModels();

  const pricing = useMemo<PricingView>(() => {
    const models = data?.models;
    if (!models || models.length === 0) {
      return PRICING_FALLBACK;
    }
    return {
      opus: pickFamilyRates(models, 'opus'),
      sonnet: pickFamilyRates(models, 'sonnet'),
    };
  }, [data]);

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
    <>
      {isError && (
        <p
          role="alert"
          style={{ marginBottom: '0.5rem', color: 'var(--danger)', fontSize: '0.875rem' }}
        >
          料金レジストリの取得に失敗しました。暫定値で表示しています。
        </p>
      )}
      {isLoading && (
        <p style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          料金情報を読み込み中... (暫定値で表示)
        </p>
      )}
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
              (opusInput / 1_000_000) * pricing.opus.input +
              (opusOutput / 1_000_000) * pricing.opus.output +
              (sonnetInput / 1_000_000) * pricing.sonnet.input +
              (sonnetOutput / 1_000_000) * pricing.sonnet.output
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
    </>
  );
}
