// ─── Color Constants ─────────────────────────────────────────────────────

export const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  opus: '#8b5cf6',
  sonnet: '#3b82f6',
  haiku: '#22d3ee',
  chart: [
    '#3b82f6', '#8b5cf6', '#22d3ee', '#22c55e',
    '#f59e0b', '#ef4444', '#ec4899', '#06b6d4',
    '#14b8a6', '#f97316',
  ],
} as const;

// ─── Model Colors ────────────────────────────────────────────────────────

export const MODEL_COLORS: Record<string, string> = {
  opus: COLORS.opus,
  sonnet: COLORS.sonnet,
  haiku: COLORS.haiku,
};

// ─── Session Classification Thresholds ───────────────────────────────────

export const SESSION_THRESHOLDS = {
  quickFix: { maxTurns: 5, maxMinutes: 10 },
  focused:  { maxTurns: 30, maxMinutes: 60 },
  exploration: { maxTurns: 60, maxMinutes: 120 },
  // heavy: anything above exploration
} as const;

export const SESSION_CLASSIFICATION_COLORS = {
  'quick-fix': '#22c55e',
  'focused': '#3b82f6',
  'exploration': '#f59e0b',
  'heavy': '#ef4444',
} as const;

export const SESSION_CLASSIFICATION_LABELS = {
  'quick-fix': 'クイックフィックス',
  'focused': 'フォーカス',
  'exploration': '探索',
  'heavy': 'ヘビー',
} as const;

// ─── Day Labels ──────────────────────────────────────────────────────────

export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

// ─── Per Page ────────────────────────────────────────────────────────────

export const PER_PAGE = 15;

// ─── Tool Categories ─────────────────────────────────────────────────────

export const TOOL_CATEGORY_COLORS: Record<string, string> = {
  file_read: '#3b82f6',
  file_write: '#8b5cf6',
  file_search: '#22d3ee',
  execution: '#22c55e',
  web: '#f59e0b',
  mcp: '#ec4899',
  agent: '#06b6d4',
  other: '#64748b',
};

// ─── Metrics Correction Cutoff ───────────────────────────────────────────
// 2026-04-25 以前のセッションはパーサバグによりトークン・コスト・ターン数が
// 1.7〜62 倍に膨張している。バックフィルは行わないため、この日付以降のデータ
// のみ KPI 比較に使用すること。
// 詳細: docs/announcements/2026-04-data-correction.md
// docs/specs/001-transcript-dedup.md (P1-T5)

export const METRICS_FIXED_SINCE: string =
  process.env.NEXT_PUBLIC_METRICS_FIXED_SINCE ??
  process.env.METRICS_FIXED_SINCE ??
  '2026-04-25';
