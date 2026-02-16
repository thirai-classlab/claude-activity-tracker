import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  message?: string;
  retry?: () => void;
}

export function ErrorDisplay({ message = 'データの読み込みに失敗しました。', retry }: ErrorDisplayProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      color: 'var(--danger)',
      gap: '12px',
    }}>
      <AlertCircle size={32} />
      <span style={{ fontSize: '13px' }}>{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="btn btn-ghost"
          style={{ marginTop: '8px' }}
        >
          再試行
        </button>
      )}
    </div>
  );
}
