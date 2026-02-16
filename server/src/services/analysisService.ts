import prisma from '../lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SaveAnalysisLogInput {
  memberEmail: string;
  analysisType?: string;
  periodFrom?: Date;
  periodTo?: Date;
  content: string;
  metadata?: Record<string, unknown>;
}

// ─── CRUD ───────────────────────────────────────────────────────────────

export async function saveAnalysisLog(data: SaveAnalysisLogInput) {
  return prisma.analysisLog.create({
    data: {
      memberEmail: data.memberEmail,
      analysisType: data.analysisType || 'member_kpi',
      periodFrom: data.periodFrom,
      periodTo: data.periodTo,
      content: data.content,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

export async function getAnalysisLogs(
  memberEmail: string,
  limit = 10,
  offset = 0,
) {
  const [data, total] = await Promise.all([
    prisma.analysisLog.findMany({
      where: { memberEmail },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.analysisLog.count({ where: { memberEmail } }),
  ]);

  return { data, total };
}

export async function getAnalysisLog(id: number) {
  return prisma.analysisLog.findUnique({ where: { id } });
}

export async function deleteAnalysisLog(id: number) {
  return prisma.analysisLog.delete({ where: { id } });
}

export async function getLatestAnalysisLog(memberEmail: string) {
  return prisma.analysisLog.findFirst({
    where: { memberEmail },
    orderBy: { createdAt: 'desc' },
  });
}
