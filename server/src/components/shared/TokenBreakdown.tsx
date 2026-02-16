import { formatCompact } from '@/lib/formatters';

interface TokenBreakdownProps {
  input: number;
  output: number;
  cacheCreation?: number;
  cacheRead?: number;
  compact?: boolean;
}

export function TokenBreakdown({ input, output, cacheCreation, cacheRead, compact = false }: TokenBreakdownProps) {
  const hasCache = (cacheCreation != null && cacheCreation > 0) || (cacheRead != null && cacheRead > 0);

  if (compact) {
    return (
      <span style={{ fontSize: '12px', fontFamily: '"SF Mono", "Fira Code", monospace' }}>
        <span style={{ color: 'var(--accent)' }}>{formatCompact(input)}</span>
        <span style={{ color: 'var(--text-muted)' }}> / </span>
        <span style={{ color: 'var(--success)' }}>{formatCompact(output)}</span>
        {hasCache && (
          <>
            <span style={{ color: 'var(--text-muted)' }}> / </span>
            <span style={{ color: 'var(--warning, #f59e0b)' }}>{formatCompact((cacheCreation || 0) + (cacheRead || 0))}</span>
          </>
        )}
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
      {hasCache && (
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>CACHE </span>
          <span style={{ color: 'var(--warning, #f59e0b)' }}>{formatCompact((cacheCreation || 0) + (cacheRead || 0))}</span>
        </div>
      )}
    </div>
  );
}
