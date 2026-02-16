'use client';

import { useParams } from 'next/navigation';
import { MemberDetailPage } from '@/components/pages/members/MemberDetailPage';

export default function MemberDetail() {
  const params = useParams();
  const email = decodeURIComponent(params.id as string);
  return <MemberDetailPage email={email} />;
}
