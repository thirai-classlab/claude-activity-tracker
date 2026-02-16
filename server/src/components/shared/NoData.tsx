import { Inbox } from 'lucide-react';

interface NoDataProps {
  message?: string;
}

export function NoData({ message = '選択されたフィルタに該当するデータがありません。' }: NoDataProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      color: 'var(--text-muted)',
      gap: '12px',
    }}>
      <Inbox size={32} />
      <span style={{ fontSize: '13px' }}>{message}</span>
    </div>
  );
}
