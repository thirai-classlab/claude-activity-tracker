// ─── Filter Types ──────────────────────────────────────────────────────────

export interface DashboardFilters {
  from?: string;
  to?: string;
  member?: string;
  repo?: string;
  model?: string;
}

// ─── API Response Types ────────────────────────────────────────────────────

export interface StatsResponse {
  totalSessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalCost: number;
  activeMembers: number;
  totalTurns: number;
  totalSubagents: number;
  totalToolUses: number;
  errorCount: number;
  repoCount: number;
  averageTurnsPerSession: number;
  averageCostPerSession: number;
  cacheEfficiency: number;
}

export interface DailyStatsItem {
  date: string;
  sessionCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
}

export interface MemberStatsItem {
  gitEmail: string;
  displayName: string | null;
  sessionCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  totalTurns: number;
}

export interface SubagentTypeItem {
  agentType: string;
  count: number;
  avgDuration: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface TopPromptItem {
  agentType: string;
  description: string;
  promptText: string;
  memberName: string;
  estimatedCost: number;
}

export interface SubagentStatsResponse {
  byType: SubagentTypeItem[];
  topPrompts: TopPromptItem[];
}

export interface ToolStatsItem {
  toolName: string;
  toolCategory: string;
  useCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  inSubagentCount: number;
}

export interface CostStatsItem {
  date: string;
  model: string;
  cost: number;
}

export interface SessionItem {
  id: number;
  sessionUuid: string;
  member: { gitEmail: string; displayName: string | null } | null;
  model: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  turnCount: number;
  subagentCount: number;
  toolUseCount: number;
  gitRepo: string | null;
  summary: string | null;
  firstPrompt: string | null;
}

export interface SessionsResponse {
  data: SessionItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface ToolUseDetail {
  toolName: string;
  toolCategory: string | null;
  toolInputSummary: string | null;
  status: string | null;
  errorMessage: string | null;
}

export interface SubagentDetail {
  agentType: string;
  agentModel: string | null;
  description: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  durationSeconds: number | null;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  toolUses: { toolName: string; toolCategory: string | null; status: string | null }[];
}

export interface FileChangeDetail {
  filePath: string;
  operation: string;
}

export interface TurnDetail {
  turnNumber: number;
  promptText: string | null;
  promptSubmittedAt: string | null;
  durationMs: number | null;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
  model: string | null;
  responseText: string | null;
  toolUses: ToolUseDetail[];
  subagents: SubagentDetail[];
  fileChanges: FileChangeDetail[];
}

export interface SessionDetailResponse {
  id: number;
  sessionUuid: string;
  member: { gitEmail: string; displayName: string | null } | null;
  model: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  estimatedCost: number;
  turnCount: number;
  subagentCount: number;
  toolUseCount: number;
  errorCount: number;
  gitRepo: string | null;
  gitBranch: string | null;
  summary: string | null;
  permissionMode: string | null;
  endReason: string | null;
  turns: TurnDetail[];
  sessionFileChanges: FileChangeDetail[];
  sessionEvents: {
    eventType: string;
    eventSubtype: string | null;
    eventData: unknown;
    occurredAt: string;
  }[];
}

export interface HeatmapItem {
  dayOfWeek: number;
  hour: number;
  count: number;
  totalTokens: number;
}

export interface SecurityStatsResponse {
  bypassPermissionSessions: number;
  permissionRequestCount: number;
  externalUrlCount: number;
  abnormalEndCount: number;
  bashCommandCount: number;
  permissionModeDistribution: { mode: string; count: number }[];
}

export interface RepoStatsItem {
  gitRepo: string;
  sessionCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  estimatedCost: number;
  memberCount: number;
  lastUsed: string | null;
}

export interface RepoDetailResponse {
  dailyStats: {
    date: string;
    sessionCount: number;
    turnCount: number;
    totalTokens: number;
  }[];
  branches: {
    gitBranch: string | null;
    sessionCount: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    sessions: {
      id: number;
      sessionUuid: string;
      gitEmail: string;
      displayName: string | null;
      startedAt: string | null;
      summary: string | null;
      turnCount: number;
      fileChangeCount: number;
    }[];
  }[];
  members: {
    gitEmail: string;
    displayName: string | null;
    sessionCount: number;
    totalTokens: number;
  }[];
  recentSessions: SessionItem[];
  frequentFiles: {
    filePath: string;
    changeCount: number;
    lastChanged: string | null;
  }[];
}

export interface MemberDetailResponse {
  dailyStats: {
    date: string;
    inputTokens: number;
    outputTokens: number;
    sessionCount: number;
  }[];
  modelBreakdown: {
    model: string;
    sessionCount: number;
    totalTokens: number;
  }[];
  recentSessions: SessionItem[];
}

export interface RepoDateHeatmapItem {
  gitRepo: string;
  date: string;
  totalTokens: number;
  sessionCount: number;
  turnCount: number;
  estimatedCost: number;
}

export interface MemberDateHeatmapItem {
  displayName: string;
  gitEmail: string;
  date: string;
  totalTokens: number;
  sessionCount: number;
  turnCount: number;
}

export interface ProductivityMetricsItem {
  displayName: string;
  gitEmail: string;
  sessionCount: number;
  totalTurns: number;
  totalToolUses: number;
  totalSubagents: number;
  totalErrors: number;
  totalTokens: number;
  totalCost: number;
  avgTurns: number;
  avgToolUses: number;
  tokensPerSession: number;
  costPerSession: number;
  errorRate: number;
}

export interface FilterOptionsResponse {
  members: { gitEmail: string; displayName: string | null }[];
  repos: string[];
  models: string[];
}

export interface PromptFeedItem {
  id: number;
  turnNumber: number;
  promptText: string | null;
  promptSubmittedAt: string | null;
  durationMs: number | null;
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  member: { gitEmail: string; displayName: string | null } | null;
  session: {
    id: number;
    gitRepo: string | null;
    gitBranch: string | null;
    summary: string | null;
  };
  toolCount: number;
}

export interface PromptFeedResponse {
  data: PromptFeedItem[];
  hasMore: boolean;
}

// ─── Session Classification ────────────────────────────────────────────────

export type SessionClassification = 'quick-fix' | 'focused' | 'exploration' | 'heavy';

export interface ClassifiedSession extends SessionItem {
  classification: SessionClassification;
  durationMinutes: number;
}

// ─── Analysis Log Types ────────────────────────────────────────────────

export interface AnalysisLogItem {
  id: number;
  memberEmail: string;
  analysisType: string;
  periodFrom: string | null;
  periodTo: string | null;
  content: string;
  metadata: string | null;
  createdAt: string;
}

export interface AnalysisLogsResponse {
  data: AnalysisLogItem[];
  total: number;
}
