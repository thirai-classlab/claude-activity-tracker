import { formatCompact } from '@/lib/formatters';

interface TokenBreakdownProps {
  input: number;
  output: number;
  compact?: boolean;
}

export function TokenBreakdown({ input, output, compact = false }: TokenBreakdownProps) {
  if (compact) {
    return (
      <span style={{ fontSize: '12px', fontFamily: '"SF Mono", "Fira Code", monospace' }}>
        <span style={{ color: 'var(--accent)' }}>{formatCompact(input)}</span>
        <span style={{ color: 'var(--text-muted)' }}> / </span>
        <span style={{ color: 'var(--success)' }}>{formatCompact(output)}</span>
      </span>
    );
  }

  return (
    <div style={{ fontSize: '12px', fontFamily: '"SF Mono", "Fira Code", monospace' }}>
      <div>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>IN </span>
        <span style={{ color: 'var(--accent)' }}>{formatCompact(input)}</span>
      </div>
      <div>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>OUT </span>
        <span style={{ color: 'var(--success)' }}>{formatCompact(output)}</span>
      </div>
    </div>
  );
}
