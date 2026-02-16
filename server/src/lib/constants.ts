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

// ─── Cost Rates (per 1M tokens) ──────────────────────────────────────────

export const COST_RATES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  opus:   { input: 15,   output: 75,  cacheWrite: 18.75, cacheRead: 1.50 },
  sonnet: { input: 3,    output: 15,  cacheWrite: 3.75,  cacheRead: 0.30 },
  haiku:  { input: 0.80, output: 4,   cacheWrite: 1.00,  cacheRead: 0.08 },
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
