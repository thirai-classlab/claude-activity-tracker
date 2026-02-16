'use client';

import { useParams } from 'next/navigation';
import { RepoDetailPage } from '@/components/pages/repos/RepoDetailPage';

export default function RepoDetail() {
  const params = useParams();
  const idSegments = params.id as string[];
  const repoId = idSegments.join('/');
  return <RepoDetailPage repoId={repoId} />;
}
