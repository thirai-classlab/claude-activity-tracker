'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ModelOverrideInput } from '@/lib/api';
import type { DashboardFilters } from '@/lib/types';

// Stable query key builder
function qk(key: string, filters?: DashboardFilters, extra?: Record<string, unknown>) {
  return [key, filters, extra].filter(Boolean);
}

export function useStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('stats', filters),
    queryFn: () => api.getStats(filters),
  });
}

export function useDailyStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('daily', filters),
    queryFn: () => api.getDailyStats(filters),
  });
}

export function useMemberStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('members', filters),
    queryFn: () => api.getMemberStats(filters),
  });
}

export function useSubagentStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('subagents', filters),
    queryFn: () => api.getSubagentStats(filters),
  });
}

export function useToolStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('tools', filters),
    queryFn: () => api.getToolStats(filters),
  });
}

export function useCostStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('costs', filters),
    queryFn: () => api.getCostStats(filters),
  });
}

export function useSessions(filters?: DashboardFilters, page?: number, perPage?: number) {
  return useQuery({
    queryKey: qk('sessions', filters, { page, perPage }),
    queryFn: () => api.getSessions(filters, page, perPage),
  });
}

export function useSessionDetail(id: number | null) {
  return useQuery({
    queryKey: ['session-detail', id],
    queryFn: () => api.getSessionDetail(id!),
    enabled: id !== null,
  });
}

export function useHeatmapData(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('heatmap', filters),
    queryFn: () => api.getHeatmapData(filters),
  });
}

export function useSecurityStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('security', filters),
    queryFn: () => api.getSecurityStats(filters),
  });
}

export function useRepoStats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('repos', filters),
    queryFn: () => api.getRepoStats(filters),
  });
}

export function useRepoDetail(repo: string | null, filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('repo-detail', filters, { repo }),
    queryFn: () => api.getRepoDetail(repo!, filters),
    enabled: repo !== null,
  });
}

export function useMemberDetail(email: string | null, filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('member-detail', filters, { email }),
    queryFn: () => api.getMemberDetail(email!, filters),
    enabled: email !== null,
  });
}

export function useRepoDateHeatmap(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('repo-date-heatmap', filters),
    queryFn: () => api.getRepoDateHeatmap(filters),
  });
}

export function useMemberDateHeatmap(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('member-date-heatmap', filters),
    queryFn: () => api.getMemberDateHeatmap(filters),
  });
}

export function useProductivityMetrics(filters?: DashboardFilters) {
  return useQuery({
    queryKey: qk('productivity', filters),
    queryFn: () => api.getProductivityMetrics(filters),
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filter-options'],
    queryFn: () => api.getFilterOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePromptFeed(filters?: DashboardFilters, limit?: number, before?: string, hours?: number) {
  return useQuery({
    queryKey: qk('prompt-feed', filters, { limit, before, hours }),
    queryFn: () => api.getPromptFeed(filters, limit, before, hours),
  });
}

export function useAnalysisLogs(email: string, limit?: number) {
  return useQuery({
    queryKey: ['analysis-logs', email, limit],
    queryFn: () => api.getAnalysisLogs(email, limit),
    enabled: !!email,
  });
}

// Pricing registry rarely changes, so cache aggressively (1 hour).
// Spec: docs/specs/002-model-pricing-registry.md
export function useModels(includeDeprecated = false) {
  return useQuery({
    queryKey: ['models', { includeDeprecated }],
    queryFn: () => api.getModels(includeDeprecated),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ─── Manual pricing override mutations (admin UI) ──────────────────────────
// Spec: docs/specs/002-model-pricing-registry.md
// Task: docs/tasks/phase-2-t11.md

function invalidateModels(client: ReturnType<typeof useQueryClient>): void {
  client.invalidateQueries({ queryKey: ['models'] });
}

export function useUpsertModelOverride() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelOverrideInput) => api.upsertModelOverride(input),
    onSuccess: () => invalidateModels(client),
  });
}

export function useDeleteModelOverride() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => api.deleteModelOverride(modelId),
    onSuccess: () => invalidateModels(client),
  });
}
