import type { ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
}

export function KpiGrid({ children }: KpiGridProps) {
  return <div className="kpi-grid">{children}</div>;
}
