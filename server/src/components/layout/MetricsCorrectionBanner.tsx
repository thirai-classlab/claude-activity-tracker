'use client';

import { useFilters } from '@/hooks/useFilters';
import { METRICS_FIXED_SINCE } from '@/lib/constants';

/**
 * 計測不能期間（パーサバグによる膨張）を知らせる恒常バナー。
 *
 * `METRICS_FIXED_SINCE` より前のデータはトークン/コスト/ターン数が
 * 1.7〜62 倍に膨張しているため、KPI 比較は修正日以降のみで行うこと。
 *
 * フィルタの `from` が cutoff 以降の場合は非表示（冪等）。
 * 詳細: docs/announcements/2026-04-data-correction.md
 */
export function MetricsCorrectionBanner() {
  const { filters } = useFilters();
  const cutoff = new Date(METRICS_FIXED_SINCE);
  const from = filters?.from ? new Date(filters.from) : null;
  if (from && !Number.isNaN(from.getTime()) && from >= cutoff) {
    return null;
  }

  return (
    <div
      role="note"
      aria-label="データ集計訂正のお知らせ"
      className="metrics-correction-banner"
      style={{
        margin: '16px 28px 0',
        padding: '12px 16px',
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.45)',
        color: '#fde68a',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <strong style={{ marginRight: 6 }}>⚠️ データ集計の訂正:</strong>
      {METRICS_FIXED_SINCE} 以前のセッションはパーサバグによりトークン・コスト・ターン数が 1.7〜62 倍に膨張しています。KPI 比較は修正日以降のデータで行ってください。
      <a
        href="/docs/announcements/2026-04-data-correction.md"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginLeft: 8,
          color: '#fcd34d',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        詳細
      </a>
    </div>
  );
}
