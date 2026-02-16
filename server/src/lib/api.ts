import type {
  DashboardFilters,
  StatsResponse,
  DailyStatsItem,
  MemberStatsItem,
  SubagentStatsResponse,
  ToolStatsItem,
  CostStatsItem,
  SessionsResponse,
  SessionDetailResponse,
  HeatmapItem,
  SecurityStatsResponse,
  RepoStatsItem,
  RepoDetailResponse,
  MemberDetailResponse,
  RepoDateHeatmapItem,
  MemberDateHeatmapItem,
  ProductivityMetricsItem,
  FilterOptionsResponse,
  PromptFeedResponse,
  AnalysisLogsResponse,
} from './types';

// ─── API Base URL ────────────────────────────────────────────────────────

const API_BASE = '/api/dashboard';

// ─── Fetch Helper ────────────────────────────────────────────────────────

function buildQuery(filters?: DashboardFilters, extra?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.member) params.set('member', filters.member);
  if (filters?.repo) params.set('repo', filters.repo);
  if (filters?.model) params.set('model', filters.model);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    // Read from window.__apiKey__ (injected by server) or env
    return (window as unknown as { __apiKey__?: string }).__apiKey__
      || process.env.NEXT_PUBLIC_API_KEY
      || '';
  }
  return process.env.NEXT_PUBLIC_API_KEY || '';
}

async function fetchApi<T>(path: string, filters?: DashboardFilters, extra?: Record<string, string | number | undefined>): Promise<T> {
  const url = `${API_BASE}${path}${buildQuery(filters, extra)}`;
  const headers: Record<string, string> = {};
  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── API Functions ───────────────────────────────────────────────────────

export const api = {
  getStats: (filters?: DashboardFilters) =>
    fetchApi<StatsResponse>('/stats', filters),

  getDailyStats: (filters?: DashboardFilters) =>
    fetchApi<DailyStatsItem[]>('/daily', filters),

  getMemberStats: (filters?: DashboardFilters) =>
    fetchApi<MemberStatsItem[]>('/members', filters),

  getSubagentStats: (filters?: DashboardFilters) =>
    fetchApi<SubagentStatsResponse>('/subagents', filters),

  getToolStats: (filters?: DashboardFilters) =>
    fetchApi<ToolStatsItem[]>('/tools', filters),

  getCostStats: (filters?: DashboardFilters) =>
    fetchApi<CostStatsItem[]>('/costs', filters),

  getSessions: (filters?: DashboardFilters, page?: number, perPage?: number) =>
    fetchApi<SessionsResponse>('/sessions', filters, { page, per_page: perPage }),

  getSessionDetail: (id: number) =>
    fetchApi<SessionDetailResponse>(`/sessions/${id}`),

  getHeatmapData: (filters?: DashboardFilters) =>
    fetchApi<HeatmapItem[]>('/heatmap', filters),

  getSecurityStats: (filters?: DashboardFilters) =>
    fetchApi<SecurityStatsResponse>('/security', filters),

  getRepoStats: (filters?: DashboardFilters) =>
    fetchApi<RepoStatsItem[]>('/repos', filters),

  getRepoDetail: (repo: string, filters?: DashboardFilters) =>
    fetchApi<RepoDetailResponse>('/repo-detail', filters, { name: repo }),

  getMemberDetail: (email: string, filters?: DashboardFilters) =>
    fetchApi<MemberDetailResponse>('/member-detail', filters, { email }),

  getRepoDateHeatmap: (filters?: DashboardFilters) =>
    fetchApi<RepoDateHeatmapItem[]>('/repo-date-heatmap', filters),

  getMemberDateHeatmap: (filters?: DashboardFilters) =>
    fetchApi<MemberDateHeatmapItem[]>('/member-date-heatmap', filters),

  getProductivityMetrics: (filters?: DashboardFilters) =>
    fetchApi<ProductivityMetricsItem[]>('/productivity', filters),

  getFilterOptions: () =>
    fetchApi<FilterOptionsResponse>('/filters'),

  getPromptFeed: (filters?: DashboardFilters, limit?: number, before?: string) =>
    fetchApi<PromptFeedResponse>('/prompt-feed', filters, { limit, before }),

  getAnalysisLogs: (email: string, limit?: number) =>
    fetchApi<AnalysisLogsResponse>('/analysis-logs', undefined, { email, limit }),
};
