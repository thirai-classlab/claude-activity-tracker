import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface AiInsightPanelProps {
  children: ReactNode;
  badge?: string;
}

export function AiInsightPanel({ children, badge = 'Phase 4' }: AiInsightPanelProps) {
  return (
    <div className="ai-insight">
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Sparkles size={14} style={{ color: '#a78bfa' }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            AI Insight
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '999px',
          background: 'rgba(139,92,246,0.15)',
          color: '#a78bfa',
          fontWeight: 600,
        }}>
          {badge}
        </span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
