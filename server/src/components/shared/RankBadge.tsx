interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const colors: Record<number, string> = {
    1: '#f59e0b',
    2: '#94a3b8',
    3: '#b45309',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      fontSize: '11px',
      fontWeight: 800,
      background: rank <= 3 ? `${colors[rank]}22` : 'transparent',
      color: rank <= 3 ? colors[rank] : 'var(--text-muted)',
      border: rank > 3 ? '1px solid var(--border)' : 'none',
    }}>
      {rank}
    </span>
  );
}
