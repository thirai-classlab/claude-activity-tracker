// ─── Number Formatters ───────────────────────────────────────────────────

export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString();
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0';
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0%';
  return Number(value).toFixed(1) + '%';
}

export function formatCost(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '$0.00';
  return '$' + Number(value).toFixed(2);
}

// ─── Duration Formatters ─────────────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h + 'h ' + rm + 'm';
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '-';
  return formatDuration(Math.round(ms / 1000));
}

/**
 * Format session duration from durationMs, or compute from start/end dates.
 * For in-progress sessions (no endedAt), calculates from startedAt to now.
 */
export function formatSessionDuration(
  durationMs: number | null | undefined,
  startedAt?: string | null,
  endedAt?: string | null,
): string {
  let ms = durationMs ?? null;

  // Fallback: compute from startedAt/endedAt
  if (ms == null && startedAt) {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    ms = end - start;
  }

  if (ms == null || ms < 0) return '-';

  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}分${remSec}秒`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}時間${remMin}分`;
}

// ─── Model Formatters ────────────────────────────────────────────────────

export function shortModel(m: string | null | undefined): string {
  if (!m) return 'unknown';
  if (m.includes('opus')) return 'Opus';
  if (m.includes('sonnet')) return 'Sonnet';
  if (m.includes('haiku')) return 'Haiku';
  return m.split('-').slice(0, 2).join('-');
}

export function modelBadgeVariant(m: string | null | undefined): 'opus' | 'sonnet' | 'haiku' | 'default' {
  if (!m) return 'default';
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return 'default';
}

// ─── Repo Formatters ─────────────────────────────────────────────────────

export function shortRepo(r: string | null | undefined): string {
  if (!r) return '-';
  const name = r.replace(/\.git$/, '').split('/').pop();
  return name || r;
}

// ─── Date Formatters ─────────────────────────────────────────────────────

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTimeShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ─── Text Helpers ────────────────────────────────────────────────────────

export function truncate(str: string | null | undefined, len: number): string {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// ─── Trend Formatter ─────────────────────────────────────────────────────

export function formatTrend(current: number, previous: number): {
  value: string;
  direction: 'up' | 'down' | 'flat';
  percentage: number;
} {
  if (previous === 0) {
    return { value: '-', direction: 'flat', percentage: 0 };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction = pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat';
  return {
    value: Math.abs(pct).toFixed(1) + '%',
    direction,
    percentage: pct,
  };
}
