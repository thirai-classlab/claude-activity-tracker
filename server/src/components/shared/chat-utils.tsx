'use client';

import { useState } from 'react';
import { Loader2, Check, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { marked } from 'marked';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ToolCall {
  toolName: string;
  args: string;
  status: 'running' | 'done';
}

// ─── getApiKey ──────────────────────────────────────────────────────────

export function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return (window as unknown as { __apiKey__?: string }).__apiKey__
      || process.env.NEXT_PUBLIC_API_KEY
      || '';
  }
  return process.env.NEXT_PUBLIC_API_KEY || '';
}

// ─── Configure marked ────────────────────────────────────────────────────

marked.setOptions({
  breaks: true,
  gfm: true,
});

// ─── renderMarkdown ─────────────────────────────────────────────────────

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

// ─── ToolCallDisplay ────────────────────────────────────────────────────

export function ToolCallDisplay({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  const allDone = toolCalls.every(tc => tc.status === 'done');
  const runningCount = toolCalls.filter(tc => tc.status === 'running').length;

  return (
    <div className="chat-tool-calls">
      <button
        className="chat-tool-calls-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="chat-tool-calls-toggle">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <Wrench size={12} />
        <span className="chat-tool-calls-summary">
          {allDone
            ? `${toolCalls.length} ツール完了`
            : `${runningCount} ツール実行中...`}
        </span>
        {!allDone && <Loader2 size={12} className="chat-spinner" />}
      </button>
      {expanded && (
        <div className="chat-tool-calls-list">
          {toolCalls.map((tc, i) => (
            <div key={i} className={`chat-tool-call-item ${tc.status}`}>
              <span className="chat-tool-call-icon">
                {tc.status === 'running'
                  ? <Loader2 size={11} className="chat-spinner" />
                  : <Check size={11} />}
              </span>
              <span className="chat-tool-call-name">{tc.toolName}</span>
              {tc.args && (
                <span className="chat-tool-call-args">{tc.args}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
