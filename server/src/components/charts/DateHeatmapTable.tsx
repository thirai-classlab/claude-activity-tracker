'use client';

interface DateHeatmapTableProps<T> {
  data: T[];
  rowKey: keyof T;
  dateKey: keyof T;
  valueKey: keyof T;
  labelFn?: (value: string) => string;
  valueFmt?: (value: number) => string;
  color?: [number, number, number];
  unitLabel?: string;
  secondaryKey?: keyof T;
  secondaryLabel?: string;
  secondaryFmt?: (value: number) => string;
  tertiaryKey?: keyof T;
  tertiaryLabel?: string;
  tertiaryFmt?: (value: number) => string;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function shortDate(d: string): string {
  if (!d) return '';
  const iso = d.split('T')[0];
  const parts = iso.split('-');
  return parts.length >= 3 ? parts[1] + '/' + parts[2] : d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DateHeatmapTable<T extends Record<string, any>>({
  data,
  rowKey,
  dateKey,
  valueKey,
  labelFn = (v) => v,
  valueFmt = formatNumber,
  color = [59, 130, 246],
  unitLabel = '',
  secondaryKey,
  secondaryLabel = '',
  secondaryFmt = formatNumber,
  tertiaryKey,
  tertiaryLabel = '',
  tertiaryFmt = formatNumber,
}: DateHeatmapTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        データがありません
      </div>
    );
  }

  // Collect unique rows and dates
  const rowSet = new Set<string>();
  const dateSet = new Set<string>();
  const grid = new Map<string, number>();
  const grid2 = new Map<string, number>();
  const grid3 = new Map<string, number>();
  let maxVal = 0;
  let minVal = Infinity;

  for (const d of data) {
    const r = String(d[rowKey] || 'unknown');
    let c = String(d[dateKey]);
    if (c.includes('T')) c = c.split('T')[0];
    const v = Number(d[valueKey]) || 0;

    rowSet.add(r);
    dateSet.add(c);
    const key = `${r}||${c}`;
    const current = (grid.get(key) || 0) + v;
    grid.set(key, current);
    if (current > maxVal) maxVal = current;
    if (current > 0 && current < minVal) minVal = current;

    if (secondaryKey) {
      const sv = Number(d[secondaryKey]) || 0;
      grid2.set(key, (grid2.get(key) || 0) + sv);
    }
    if (tertiaryKey) {
      const tv = Number(d[tertiaryKey]) || 0;
      grid3.set(key, (grid3.get(key) || 0) + tv);
    }
  }

  const rows = Array.from(rowSet);
  const dates = Array.from(dateSet).sort();
  const actualMinVal = minVal === Infinity ? 0 : minVal;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
        <thead>
          <tr>
            <th style={{
              padding: '4px 8px',
              color: 'var(--text-muted)',
              textAlign: 'left',
              position: 'sticky',
              left: 0,
              background: 'var(--bg-card, #fff)',
              zIndex: 1,
              minWidth: '100px',
              maxWidth: '150px',
            }} />
            {dates.map((d) => (
              <th key={d} style={{
                padding: '4px 2px',
                color: 'var(--text-muted)',
                fontWeight: 500,
                textAlign: 'center',
                minWidth: '36px',
                whiteSpace: 'nowrap',
              }}>
                {shortDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td style={{
                padding: '4px 8px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '150px',
                position: 'sticky',
                left: 0,
                background: 'var(--bg-card, #fff)',
                zIndex: 1,
              }} title={row}>
                {labelFn(row)}
              </td>
              {dates.map((d) => {
                const key = `${row}||${d}`;
                const val = grid.get(key) || 0;
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const alpha = val === 0 ? 0.03 : 0.12 + intensity * 0.88;
                const bg = `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(2)})`;
                let title = `${labelFn(row)} / ${d}`;
                if (val > 0) {
                  const parts: string[] = [];
                  parts.push(`${unitLabel}: ${valueFmt(val)}`);
                  if (secondaryKey) {
                    parts.push(`${secondaryLabel}: ${secondaryFmt(grid2.get(key) || 0)}`);
                  }
                  if (tertiaryKey) {
                    parts.push(`${tertiaryLabel}: ${tertiaryFmt(grid3.get(key) || 0)}`);
                  }
                  title += '\n' + parts.join('\n');
                }
                return (
                  <td key={d} style={{ padding: '2px' }}>
                    <div
                      title={title}
                      style={{
                        width: '100%',
                        height: '18px',
                        borderRadius: '3px',
                        background: bg,
                        minWidth: '30px',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '8px',
        justifyContent: 'flex-end',
        fontSize: '10px',
        color: 'var(--text-muted)',
      }}>
        <span>少</span>
        {[0.1, 0.3, 0.55, 0.8, 1.0].map(a => (
          <span
            key={a}
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '2px',
              backgroundColor: `rgba(${color[0]},${color[1]},${color[2]},${a.toFixed(2)})`,
            }}
          />
        ))}
        <span>多</span>
        <span style={{ marginLeft: '8px' }}>
          | min: {valueFmt(actualMinVal)} / max: {valueFmt(maxVal)} {unitLabel}
        </span>
      </div>
    </div>
  );
}
