interface TrendArrowProps {
  direction: 'up' | 'down' | 'flat';
  label: string;
  goodDirection?: 'up' | 'down';
}

export function TrendArrow({ direction, label, goodDirection = 'up' }: TrendArrowProps) {
  if (direction === 'flat') return null;

  const isGood = direction === goodDirection;
  const colorClass = isGood ? 'var(--success)' : 'var(--danger)';
  const arrow = direction === 'up' ? '▲' : '▼';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: '12px',
      fontWeight: 600,
      marginTop: '6px',
      color: colorClass,
    }}>
      {arrow} {label}
    </span>
  );
}
