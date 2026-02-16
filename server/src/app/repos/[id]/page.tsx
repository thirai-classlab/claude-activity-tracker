'use client';

import { useParams } from 'next/navigation';
import { RepoDetailPage } from '@/components/pages/repos/RepoDetailPage';

export default function RepoDetail() {
  const params = useParams();
  return <RepoDetailPage repoId={params.id as string} />;
}
