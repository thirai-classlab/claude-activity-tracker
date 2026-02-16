import type { StatsResponse, ToolStatsItem, MemberStatsItem } from './types';

export interface Hint {
  type: 'info' | 'warning';
  title: string;
  text: string;
  link?: { label: string; href: string };
}

/**
 * Generate hints based on stats data (7 rules).
 */
export function generateHints(
  stats: StatsResponse,
  tools: ToolStatsItem[],
  members: MemberStatsItem[],
): Hint[] {
  const hints: Hint[] = [];

  // Rule 1: Low cache efficiency
  if (stats.cacheEfficiency < 0.3 && stats.totalSessions > 10) {
    hints.push({
      type: 'info',
      title: 'CACHE OPTIMIZATION',
      text: `Cache efficiency is ${(stats.cacheEfficiency * 100).toFixed(1)}%. Consider using longer sessions or project-level context to improve cache hit rates.`,
    });
  }

  // Rule 3: High error rate
  const errorRate = stats.totalToolUses > 0 ? stats.errorCount / stats.totalToolUses : 0;
  if (errorRate > 0.1 && stats.totalToolUses > 50) {
    hints.push({
      type: 'warning',
      title: 'ERROR RATE',
      text: `Tool error rate is ${(errorRate * 100).toFixed(1)}%. Review common failure patterns in tool usage.`,
    });
  }

  // Rule 4: Dominant tool usage
  if (tools.length > 0) {
    const totalUses = tools.reduce((s, t) => s + t.useCount, 0);
    const topTool = tools[0];
    if (topTool && topTool.useCount / totalUses > 0.4) {
      hints.push({
        type: 'info',
        title: 'TOOL USAGE PATTERN',
        text: `"${topTool.toolName}" accounts for ${((topTool.useCount / totalUses) * 100).toFixed(0)}% of all tool usage. This is typical for code-heavy workflows.`,
      });
    }
  }

  // Rule 5: Member concentration
  if (members.length > 1) {
    const totalCost = members.reduce((s, m) => s + m.estimatedCost, 0);
    const topMember = members[0];
    if (topMember && totalCost > 0 && topMember.estimatedCost / totalCost > 0.6) {
      hints.push({
        type: 'info',
        title: 'USAGE CONCENTRATION',
        text: `${topMember.displayName || topMember.gitEmail} accounts for ${((topMember.estimatedCost / totalCost) * 100).toFixed(0)}% of total cost.`,
        link: { label: 'View Member Analysis', href: '/members' },
      });
    }
  }

  // Rule 6: High subagent usage
  if (stats.totalSubagents > 0 && stats.totalSessions > 0) {
    const subagentsPerSession = stats.totalSubagents / stats.totalSessions;
    if (subagentsPerSession > 5) {
      hints.push({
        type: 'info',
        title: 'SUBAGENT USAGE',
        text: `Average ${subagentsPerSession.toFixed(1)} subagents per session. Heavy subagent usage increases costs but can improve quality.`,
      });
    }
  }

  // Rule 7: No activity warning
  if (stats.totalSessions === 0) {
    hints.push({
      type: 'warning',
      title: 'NO DATA',
      text: 'No sessions found for the selected period. Adjust the date range or check that hooks are configured correctly.',
    });
  }

  return hints;
}
