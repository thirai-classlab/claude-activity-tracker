'use client';

import { Download } from 'lucide-react';
import { toCSV, downloadCSV } from '@/lib/csv-export';

interface CsvExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: { key: keyof T; header: string }[];
  filename: string;
}

export function CsvExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
}: CsvExportButtonProps<T>) {
  const handleExport = () => {
    const csv = toCSV(data, columns);
    downloadCSV(csv, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="btn btn-ghost"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      <Download size={14} />
      CSV
    </button>
  );
}
