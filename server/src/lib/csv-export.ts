/**
 * Convert an array of objects to CSV string.
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const header = columns.map(c => `"${c.header}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val == null) return '""';
      if (typeof val === 'number') return String(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','),
  );
  return [header, ...rows].join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
