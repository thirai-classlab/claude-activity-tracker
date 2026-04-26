/**
 * One-shot session cost recalculation.
 *
 * Walks every row in `sessions`, recomputes:
 *   - per-subagent `subagents.estimated_cost`
 *   - session `subagent_estimated_cost` (sum of subagent rows)
 *   - session `estimated_cost` (main-agent totals priced via current pricing)
 *
 * Use this whenever the pricing logic changes (e.g. tier resolution rules,
 * registry updates) and historical rows need to be brought back in line.
 *
 * Triggering context: D-008 follow-up — the previous usage-based 1M tier
 * auto-promote was incorrect and over-billed long sessions ~1.9x. After
 * removing that heuristic, run this script once to correct historical totals.
 *
 * Usage:
 *   docker compose exec api npx tsx scripts/recalc-costs.ts
 *   # or, locally with a .env that points at the DB:
 *   npx tsx scripts/recalc-costs.ts
 *
 * Flags:
 *   --dry-run    Print before/after totals; do not write.
 *
 * Output:
 *   Per-session summary line + final aggregate totals.
 */
import prisma from '../src/lib/prisma';
import { calculateCost } from '../src/services/costCalculator';

const DRY_RUN = process.argv.includes('--dry-run');

function fmt(n: number): string {
  return n.toFixed(4);
}

async function recalcSubagents(
  sessionId: number,
  fallbackModel: string,
): Promise<{ subBefore: number; subAfter: number }> {
  const subagents = await prisma.subagent.findMany({
    where: { sessionId },
    select: {
      id: true,
      agentModel: true,
      inputTokens: true,
      outputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      estimatedCost: true,
    },
  });

  let subBefore = 0;
  let subAfter = 0;
  for (const s of subagents) {
    const before = Number(s.estimatedCost ?? 0);
    const after = await calculateCost(s.agentModel || fallbackModel, {
      inputTokens: Number(s.inputTokens ?? 0),
      outputTokens: Number(s.outputTokens ?? 0),
      cacheCreationTokens: Number(s.cacheCreationTokens ?? 0),
      cacheReadTokens: Number(s.cacheReadTokens ?? 0),
    });
    subBefore += before;
    subAfter += after;

    if (!DRY_RUN && before !== after) {
      await prisma.subagent.update({
        where: { id: s.id },
        data: { estimatedCost: after },
      });
    }
  }
  return { subBefore, subAfter: Math.round(subAfter * 10000) / 10000 };
}

async function main(): Promise<void> {
  console.log(`[recalc-costs] ${DRY_RUN ? 'DRY RUN — no writes' : 'WRITE MODE'}`);

  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      sessionUuid: true,
      model: true,
      totalInputTokens: true,
      totalOutputTokens: true,
      totalCacheCreationTokens: true,
      totalCacheReadTokens: true,
      estimatedCost: true,
      subagentEstimatedCost: true,
    },
  });

  let mainBeforeSum = 0;
  let mainAfterSum = 0;
  let subBeforeSum = 0;
  let subAfterSum = 0;

  for (const row of sessions) {
    const model = row.model || 'unknown';

    const mainBefore = Number(row.estimatedCost ?? 0);
    const mainAfter = await calculateCost(model, {
      inputTokens: Number(row.totalInputTokens ?? 0),
      outputTokens: Number(row.totalOutputTokens ?? 0),
      cacheCreationTokens: Number(row.totalCacheCreationTokens ?? 0),
      cacheReadTokens: Number(row.totalCacheReadTokens ?? 0),
    });

    const { subBefore, subAfter } = await recalcSubagents(row.id, model);

    if (!DRY_RUN) {
      await prisma.session.update({
        where: { id: row.id },
        data: {
          estimatedCost: mainAfter,
          subagentEstimatedCost: subAfter,
        },
      });
    }

    mainBeforeSum += mainBefore;
    mainAfterSum += mainAfter;
    subBeforeSum += subBefore;
    subAfterSum += subAfter;

    const mainDelta = mainAfter - mainBefore;
    const subDelta = subAfter - subBefore;
    console.log(
      `  ${(row.sessionUuid ?? String(row.id)).slice(0, 12)}… | ${model.padEnd(28)} | ` +
        `main ${fmt(mainBefore)} → ${fmt(mainAfter)} (Δ ${fmt(mainDelta)}) | ` +
        `sub ${fmt(subBefore)} → ${fmt(subAfter)} (Δ ${fmt(subDelta)})`,
    );
  }

  console.log('---');
  console.log(`sessions touched:        ${sessions.length}`);
  console.log(`main estimated_cost:     ${fmt(mainBeforeSum)} → ${fmt(mainAfterSum)} (Δ ${fmt(mainAfterSum - mainBeforeSum)})`);
  console.log(`subagent estimated_cost: ${fmt(subBeforeSum)} → ${fmt(subAfterSum)} (Δ ${fmt(subAfterSum - subBeforeSum)})`);
  console.log(
    `combined total:          ${fmt(mainBeforeSum + subBeforeSum)} → ${fmt(mainAfterSum + subAfterSum)} (Δ ${fmt(mainAfterSum + subAfterSum - mainBeforeSum - subBeforeSum)})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
