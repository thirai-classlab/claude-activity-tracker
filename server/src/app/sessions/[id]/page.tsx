'use client';

import { useParams } from 'next/navigation';
import { SessionDetailPage } from '@/components/pages/sessions/SessionDetailPage';

export default function SessionDetail() {
  const params = useParams();
  const id = Number(params.id);
  if (isNaN(id)) return null;
  return <SessionDetailPage sessionId={id} />;
}
