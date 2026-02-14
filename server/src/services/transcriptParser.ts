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
 * Parse a Claude Code transcript JSONL file and extract structured data.
 * Each line in the file is a JSON object representing a transcript entry.
 *
 * This is a server-side parser intended for dev/testing purposes.
 * In production, the hook scripts perform the parsing and send pre-parsed data.
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
        processAssistantEntry(entry, result);
        break;
      }
      case 'user':
      case 'human': {
        result.turnCount++;
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
  result: ParsedTranscript
): void {
  // Extract usage data
  const message = entry.message as Record<string, unknown> | undefined;
  if (message) {
    const usage = message.usage as Record<string, unknown> | undefined;
    if (usage) {
      result.tokens.input += (usage.input_tokens as number) || 0;
      result.tokens.output += (usage.output_tokens as number) || 0;
      result.tokens.cacheCreation += (usage.cache_creation_input_tokens as number) || 0;
      result.tokens.cacheRead += (usage.cache_read_input_tokens as number) || 0;
    }

    // Extract model
    if (message.model && !result.model) {
      result.model = message.model as string;
    }

    // Extract tool_use blocks from content
    const content = message.content as unknown[];
    if (Array.isArray(content)) {
      for (const block of content) {
        const blockObj = block as Record<string, unknown>;
        if (blockObj.type === 'tool_use') {
          const toolName = (blockObj.name as string) || 'unknown';
          const toolInput = (blockObj.input as Record<string, unknown>) || {};
          const mcpInfo = parseMcpToolName(toolName);

          const toolUse: ParsedToolUse = {
            toolUseUuid: (blockObj.id as string) || '',
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
    }
  }
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
