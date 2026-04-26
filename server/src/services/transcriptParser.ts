import * as fs from 'fs';
import { getToolCategory, parseMcpToolName, getToolInputSummary } from '../utils/toolCategory';

export interface ParsedToolUse {
  toolUseUuid: string;
  toolName: string;
  toolCategory: string;
  toolInputSummary: string;
  isMcp: boolean;
  mcpServer: string | null;
  status: string;
  errorMessage: string | null;
}

export interface ParsedTranscript {
  tokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
    totalInput: number;
  };
  model: string | null;
  toolUses: ParsedToolUse[];
  fileChanges: Array<{ filePath: string; operation: string }>;
  sessionEvents: Array<{
    eventType: string;
    eventSubtype: string | null;
    eventData: Record<string, unknown> | null;
  }>;
  turnDurations: Array<{ durationMs: number }>;
  summaries: string[];
  turnCount: number;
  compactCount: number;
  errorCount: number;
}

/**
 * Per-parse dedup context.
 *
 * Claude Code's transcript JSONL writes one line per content block when an
 * assistant message contains multiple blocks (e.g. text + tool_use + tool_use).
 * All lines share the same `message.id` and carry an identical `usage` payload.
 * Without dedup, naive `+=` accumulation inflates tokens / tool_use counts by
 * the per-response block count (observed 1.7x - 2.0x, up to 62x).
 *
 * Hash key is `${message.id}:${requestId}` (ccusage alignment, spec 006).
 * Falls back to legacy "always count" path when either id is missing.
 *
 * Specs:
 *   - docs/specs/001-transcript-dedup.md
 *   - docs/specs/006-ccusage-alignment.md
 */
interface DedupContext {
  seenHashes: Set<string>;
  seenToolUseIds: Set<string>;
}

/**
 * Build the dedup hash for an assistant entry.
 *
 * Returns `null` when either `message.id` or `requestId` is missing — caller
 * treats null as "do not dedup" (legacy fallback) so older transcripts
 * without ids still accumulate usage instead of dropping silently.
 *
 * Mirrors ccusage `createUniqueHash` (apps/ccusage/src/data-loader.ts).
 */
function buildDedupHash(
  messageId: string | null,
  requestId: string | null,
): string | null {
  if (!messageId || !requestId) return null;
  return `${messageId}:${requestId}`;
}

/**
 * Parse a Claude Code transcript JSONL file and extract structured data.
 * Each line in the file is a JSON object representing a transcript entry.
 *
 * This is a server-side parser intended for dev/testing purposes and for
 * future backfill scripts. It mirrors the dedup behavior of
 * `setup/hooks/shared/utils.js::parseTranscript`.
 */
export function parseTranscriptFile(transcriptPath: string): ParsedTranscript {
  const result: ParsedTranscript = {
    tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, totalInput: 0 },
    model: null,
    toolUses: [],
    fileChanges: [],
    sessionEvents: [],
    turnDurations: [],
    summaries: [],
    turnCount: 0,
    compactCount: 0,
    errorCount: 0,
  };

  if (!fs.existsSync(transcriptPath)) {
    return result;
  }

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const dedup: DedupContext = {
    seenHashes: new Set<string>(),
    seenToolUseIds: new Set<string>(),
  };

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const type = entry.type as string | undefined;

    switch (type) {
      case 'assistant': {
        processAssistantEntry(entry, result, dedup);
        break;
      }
      case 'user':
      case 'human': {
        processUserEntry(entry, result);
        break;
      }
      case 'tool_result': {
        processToolResultEntry(entry, result);
        break;
      }
      case 'summary': {
        const summaryText = entry.summary as string | undefined;
        if (summaryText) {
          result.summaries.push(summaryText);
        }
        break;
      }
      default:
        break;
    }

    // Check for compact boundary
    if (entry.isCompactBoundary || entry.type === 'compact_boundary') {
      result.compactCount++;
      result.sessionEvents.push({
        eventType: 'compact',
        eventSubtype: (entry.subtype as string) || null,
        eventData: entry.data ? (entry.data as Record<string, unknown>) : null,
      });
    }

    // Check for turn_duration entries
    if (entry.type === 'turn_duration' && typeof entry.durationMs === 'number') {
      result.turnDurations.push({ durationMs: entry.durationMs as number });
    }
  }

  // Calculate total input tokens
  result.tokens.totalInput =
    result.tokens.input + result.tokens.cacheCreation + result.tokens.cacheRead;

  return result;
}

function processAssistantEntry(
  entry: Record<string, unknown>,
  result: ParsedTranscript,
  dedup: DedupContext
): void {
  const message = entry.message as Record<string, unknown> | undefined;
  if (!message) return;

  const messageId = typeof message.id === 'string' ? message.id : null;
  // requestId is at the entry root in Claude Code transcripts; fall back to
  // message.requestId if the shape changes. Missing → no dedup (legacy U4).
  const entryRequestId = typeof entry.requestId === 'string' ? entry.requestId : null;
  const messageRequestId = typeof message.requestId === 'string' ? message.requestId : null;
  const requestId = entryRequestId ?? messageRequestId;
  const dedupHash = buildDedupHash(messageId, requestId);
  const isDuplicateMessage = dedupHash !== null && dedup.seenHashes.has(dedupHash);

  // ccusage-aligned: skip `<synthetic>` model rows entirely. They're emitted
  // by Claude Code for compaction / resume bookkeeping and must not contribute
  // to user-facing usage. See docs/specs/006-ccusage-alignment.md.
  const isSyntheticModel = message.model === '<synthetic>';
  if (isSyntheticModel) return;

  // Usage is only counted the first time a given (messageId, requestId) hash
  // is seen. If either id is missing (legacy / malformed row), fall through
  // to the legacy "always count" path to avoid regressions (U4).
  if (!isDuplicateMessage) {
    if (dedupHash !== null) {
      dedup.seenHashes.add(dedupHash);
    }

    const usage = message.usage as Record<string, unknown> | undefined;
    if (usage) {
      result.tokens.input += (usage.input_tokens as number) || 0;
      result.tokens.output += (usage.output_tokens as number) || 0;
      result.tokens.cacheCreation += (usage.cache_creation_input_tokens as number) || 0;
      result.tokens.cacheRead += (usage.cache_read_input_tokens as number) || 0;
    }

    if (message.model && !result.model) {
      result.model = message.model as string;
    }
  }

  // Content blocks are walked for every row (even duplicates), because
  // Claude Code sometimes splits text + tool_use into separate rows that share
  // the same message.id. tool_use blocks are still deduped by block.id (U9),
  // and duplicate text rows are naturally harmless for the fields this parser
  // tracks. This mirrors `shared/utils.js::parseTranscript` behavior.
  const content = message.content as unknown[];
  if (!Array.isArray(content)) return;

  for (const block of content) {
    const blockObj = block as Record<string, unknown>;
    if (blockObj.type !== 'tool_use') continue;

    const toolUseId = typeof blockObj.id === 'string' ? blockObj.id : '';
    if (toolUseId && dedup.seenToolUseIds.has(toolUseId)) {
      continue;
    }
    if (toolUseId) {
      dedup.seenToolUseIds.add(toolUseId);
    }

    const toolName = (blockObj.name as string) || 'unknown';
    const toolInput = (blockObj.input as Record<string, unknown>) || {};
    const mcpInfo = parseMcpToolName(toolName);

    const toolUse: ParsedToolUse = {
      toolUseUuid: toolUseId,
      toolName,
      toolCategory: getToolCategory(toolName),
      toolInputSummary: getToolInputSummary(toolName, toolInput),
      isMcp: mcpInfo.isMcp,
      mcpServer: mcpInfo.mcpServer,
      status: 'success', // updated later if tool_result has error
      errorMessage: null,
    };

    result.toolUses.push(toolUse);

    // Extract file changes from Write/Edit tools
    extractFileChanges(toolName, toolInput, result);
  }
}

/**
 * Count a user-side row as a new turn only when it represents a real prompt.
 *
 * Skip:
 *   - rows whose content is exclusively tool_result blocks (tool call return)
 *   - rows whose textual content is entirely system-reminder injected text
 *     (hook output / compact / resume synthetic messages)
 *
 * This mirrors `shared/utils.js` turn detection and covers U5 / U6 / U7.
 */
function processUserEntry(entry: Record<string, unknown>, result: ParsedTranscript): void {
  const message = entry.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (typeof content === 'string') {
    if (content.trimStart().startsWith('<system-reminder>')) {
      return;
    }
    result.turnCount++;
    return;
  }

  if (Array.isArray(content)) {
    if (content.length === 0) {
      result.turnCount++;
      return;
    }

    const isToolResultOnly = content.every(
      (b) => (b as Record<string, unknown>).type === 'tool_result'
    );
    if (isToolResultOnly) {
      return;
    }

    // Count as a turn only if at least one text block is not a system-reminder.
    const textBlocks = content.filter(
      (b) => (b as Record<string, unknown>).type === 'text'
    ) as Array<Record<string, unknown>>;

    if (textBlocks.length === 0) {
      // Non-tool_result, non-text content (e.g. image-only) still counts as a turn.
      result.turnCount++;
      return;
    }

    const hasRealText = textBlocks.some((tb) => {
      const text = String(tb.text || '');
      return !text.trimStart().startsWith('<system-reminder>');
    });

    if (hasRealText) {
      result.turnCount++;
    }
    return;
  }

  // Fallback: unknown shape → count as turn (historical behavior)
  result.turnCount++;
}

function processToolResultEntry(
  entry: Record<string, unknown>,
  result: ParsedTranscript
): void {
  const toolUseId = entry.tool_use_id as string | undefined;
  if (!toolUseId) return;

  const isError = entry.is_error === true;
  if (isError) {
    result.errorCount++;
    // Find the matching tool_use and update its status
    const matchingTool = result.toolUses.find((t) => t.toolUseUuid === toolUseId);
    if (matchingTool) {
      matchingTool.status = 'failure';
      const content = entry.content;
      if (typeof content === 'string') {
        matchingTool.errorMessage = content.substring(0, 500);
      } else if (Array.isArray(content)) {
        const textBlock = content.find(
          (c: unknown) => (c as Record<string, unknown>).type === 'text'
        ) as Record<string, unknown> | undefined;
        if (textBlock) {
          matchingTool.errorMessage = String(textBlock.text || '').substring(0, 500);
        }
      }
    }
  }
}

function extractFileChanges(
  toolName: string,
  toolInput: Record<string, unknown>,
  result: ParsedTranscript
): void {
  const filePath = (toolInput.file_path || toolInput.filePath || toolInput.notebook_path) as
    | string
    | undefined;

  if (!filePath) return;

  let operation: string;
  switch (toolName) {
    case 'Read':
      operation = 'read';
      break;
    case 'Write':
      operation = 'write';
      break;
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      operation = 'edit';
      break;
    default:
      return;
  }

  // Avoid duplicate file_path + operation combinations
  const exists = result.fileChanges.some(
    (fc) => fc.filePath === filePath && fc.operation === operation
  );
  if (!exists) {
    result.fileChanges.push({ filePath, operation });
  }
}
