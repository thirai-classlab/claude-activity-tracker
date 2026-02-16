import Link from 'next/link';
import { Info, AlertTriangle } from 'lucide-react';
import type { Hint } from '@/lib/hints';

interface HintCardProps {
  hint: Hint;
}

export function HintCard({ hint }: HintCardProps) {
  const Icon = hint.type === 'warning' ? AlertTriangle : Info;

  return (
    <div className={`hint-card ${hint.type === 'warning' ? 'warning' : ''}`}>
      <span className="hint-icon">
        <Icon size={16} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          color: hint.type === 'warning' ? 'var(--warning)' : 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '4px',
        }}>
          {hint.title}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {hint.text}
        </div>
        {hint.link && (
          <Link href={hint.link.href} style={{
            fontSize: '12px',
            color: 'var(--accent)',
            marginTop: '4px',
            display: 'inline-block',
          }}>
            {hint.link.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
