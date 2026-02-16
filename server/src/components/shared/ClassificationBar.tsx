import type { SessionClassification } from '@/lib/types';
import { SESSION_CLASSIFICATION_COLORS, SESSION_CLASSIFICATION_LABELS } from '@/lib/constants';

interface ClassificationBarProps {
  summary: Record<SessionClassification, number>;
  total: number;
}

export function ClassificationBar({ summary, total }: ClassificationBarProps) {
  const types: SessionClassification[] = ['quick-fix', 'focused', 'exploration', 'heavy'];

  return (
    <div className="classification-bar">
      {types.map(type => {
        const count = summary[type];
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
        return (
          <div key={type} className="class-item">
            <span
              className="class-dot"
              style={{ width: 10, height: 10, borderRadius: '50%', background: SESSION_CLASSIFICATION_COLORS[type] }}
            />
            <div className="class-info">
              <div className="class-name">{SESSION_CLASSIFICATION_LABELS[type]}</div>
              <div className="class-pct">{pct}%</div>
              <div className="class-desc">{count}件</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
