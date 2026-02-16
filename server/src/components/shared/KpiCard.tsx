import { TrendArrow } from './TrendArrow';

export type KpiColor = 'blue' | 'green' | 'purple' | 'amber' | 'cyan';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: KpiColor;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
    goodDirection?: 'up' | 'down'; // which direction is "good"
  };
}

export function KpiCard({ label, value, sub, color = 'blue', trend }: KpiCardProps) {
  return (
    <div className={`kpi-card ${color}`}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.2, marginTop: '4px' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {sub}
        </div>
      )}
      {trend && trend.direction !== 'flat' && (
        <TrendArrow
          direction={trend.direction}
          label={trend.label}
          goodDirection={trend.goodDirection}
        />
      )}
    </div>
  );
}
