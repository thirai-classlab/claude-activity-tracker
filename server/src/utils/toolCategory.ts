export type ToolCategory = 'search' | 'file_edit' | 'bash' | 'subagent' | 'web' | 'mcp' | 'other';

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  // search: file reading and searching tools
  Read: 'search',
  Glob: 'search',
  Grep: 'search',

  // file_edit: file modification tools
  Write: 'file_edit',
  Edit: 'file_edit',
  MultiEdit: 'file_edit',
  NotebookEdit: 'file_edit',

  // bash: command execution
  Bash: 'bash',

  // subagent: sub-agent spawning
  Task: 'subagent',

  // web: web access tools
  WebFetch: 'web',
  WebSearch: 'web',
};

/**
 * Classify a tool name into a category.
 * MCP tools (prefixed with "mcp__") are classified as "mcp".
 * Built-in tools are mapped via TOOL_CATEGORY_MAP.
 * Unknown tools default to "other".
 */
export function getToolCategory(toolName: string): ToolCategory {
  if (toolName.startsWith('mcp__')) {
    return 'mcp';
  }
  return TOOL_CATEGORY_MAP[toolName] || 'other';
}

/**
 * Parse an MCP tool name into its components.
 * MCP tools follow the pattern: mcp__SERVER__tool_name
 */
export function parseMcpToolName(toolName: string): { isMcp: boolean; mcpServer: string | null } {
  if (!toolName.startsWith('mcp__')) {
    return { isMcp: false, mcpServer: null };
  }

  const parts = toolName.split('__');
  // mcp__SERVER__tool => parts = ['mcp', 'SERVER', 'tool']
  const mcpServer = parts.length >= 2 ? parts[1] : null;
  return { isMcp: true, mcpServer };
}

/**
 * Extract a human-readable summary from tool input based on the tool name.
 * Returns a short string describing what the tool invocation does.
 */
export function getToolInputSummary(toolName: string, toolInput: Record<string, unknown>): string {
  try {
    switch (toolName) {
      case 'Read':
        return truncate(String(toolInput.file_path || toolInput.filePath || ''), 200);

      case 'Glob':
        return truncate(String(toolInput.pattern || ''), 200);

      case 'Grep': {
        const pattern = String(toolInput.pattern || '');
        const path = toolInput.path ? ` in ${toolInput.path}` : '';
        return truncate(`${pattern}${path}`, 200);
      }

      case 'Write':
      case 'Edit':
      case 'MultiEdit':
      case 'NotebookEdit':
        return truncate(String(toolInput.file_path || toolInput.filePath || toolInput.notebook_path || ''), 200);

      case 'Bash': {
        const command = String(toolInput.command || '');
        return truncate(command, 200);
      }

      case 'Task': {
        const description = toolInput.description || toolInput.prompt || '';
        return truncate(String(description), 200);
      }

      case 'WebFetch':
        return truncate(String(toolInput.url || ''), 200);

      case 'WebSearch':
        return truncate(String(toolInput.query || ''), 200);

      default:
        // For MCP and other tools, try common field names
        if (toolName.startsWith('mcp__')) {
          const keys = Object.keys(toolInput);
          if (keys.length === 0) return '';
          // Return first few key-value pairs
          const summary = keys
            .slice(0, 3)
            .map((k) => `${k}=${truncate(String(toolInput[k] || ''), 50)}`)
            .join(', ');
          return truncate(summary, 200);
        }
        return truncate(JSON.stringify(toolInput).substring(0, 200), 200);
    }
  } catch {
    return '';
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}
