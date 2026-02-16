import type { SessionItem, SessionClassification, ClassifiedSession } from './types';
import { SESSION_THRESHOLDS } from './constants';

/**
 * Classify a session based on turn count and duration.
 */
export function classifySession(session: SessionItem): SessionClassification {
  const turns = session.turnCount || 0;
  const durationMinutes = getDurationMinutes(session);

  if (turns <= SESSION_THRESHOLDS.quickFix.maxTurns && durationMinutes <= SESSION_THRESHOLDS.quickFix.maxMinutes) {
    return 'quick-fix';
  }
  if (turns <= SESSION_THRESHOLDS.focused.maxTurns && durationMinutes <= SESSION_THRESHOLDS.focused.maxMinutes) {
    return 'focused';
  }
  if (turns <= SESSION_THRESHOLDS.exploration.maxTurns && durationMinutes <= SESSION_THRESHOLDS.exploration.maxMinutes) {
    return 'exploration';
  }
  return 'heavy';
}

/**
 * Get session duration in minutes.
 */
function getDurationMinutes(session: SessionItem): number {
  if (!session.startedAt || !session.endedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt).getTime();
  return (end - start) / (1000 * 60);
}

/**
 * Classify all sessions and return with classification metadata.
 */
export function classifySessions(sessions: SessionItem[]): ClassifiedSession[] {
  return sessions.map(session => ({
    ...session,
    classification: classifySession(session),
    durationMinutes: getDurationMinutes(session),
  }));
}

/**
 * Get classification summary counts.
 */
export function getClassificationSummary(sessions: ClassifiedSession[]): Record<SessionClassification, number> {
  const summary: Record<SessionClassification, number> = {
    'quick-fix': 0,
    'focused': 0,
    'exploration': 0,
    'heavy': 0,
  };
  for (const s of sessions) {
    summary[s.classification]++;
  }
  return summary;
}
