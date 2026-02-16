'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { DashboardFilters } from '@/lib/types';
import { loadFilters, saveFilters, clearFilters as clearStorage } from '@/lib/filter-storage';

interface FilterContextValue {
  filters: DashboardFilters;
  setFilter: (key: keyof DashboardFilters, value: string | undefined) => void;
  setFilters: (filters: DashboardFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  isSaved: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<DashboardFilters>({});
  const [isSaved, setIsSaved] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    const saved = loadFilters();
    if (Object.keys(saved).length > 0) {
      setFiltersState(saved);
      setIsSaved(true);
    }
  }, []);

  const setFilter = useCallback((key: keyof DashboardFilters, value: string | undefined) => {
    setFiltersState(prev => {
      const next = { ...prev };
      if (value === undefined || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      saveFilters(next);
      setIsSaved(true);
      return next;
    });
  }, []);

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    setFiltersState(newFilters);
    saveFilters(newFilters);
    setIsSaved(true);
  }, []);

  const clearFiltersHandler = useCallback(() => {
    setFiltersState({});
    clearStorage();
    setIsSaved(false);
  }, []);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <FilterContext.Provider value={{
      filters,
      setFilter,
      setFilters,
      clearFilters: clearFiltersHandler,
      hasActiveFilters,
      isSaved,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return ctx;
}
