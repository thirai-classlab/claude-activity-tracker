import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, action, children, height }: ChartCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div className="card-body" style={{ height: height ? `${height}px` : undefined }}>
        {children}
      </div>
    </div>
  );
}
