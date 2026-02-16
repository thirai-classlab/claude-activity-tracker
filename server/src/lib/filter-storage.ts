import type { DashboardFilters } from './types';

const STORAGE_KEY = 'aidd-dashboard-filters';

export function loadFilters(): DashboardFilters {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DashboardFilters;
  } catch {
    return {};
  }
}

export function saveFilters(filters: DashboardFilters): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

export function clearFilters(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function hasStoredFilters(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DashboardFilters;
    return Object.values(parsed).some(v => v !== undefined && v !== '');
  } catch {
    return false;
  }
}
