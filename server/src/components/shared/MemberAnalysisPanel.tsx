'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, AlertCircle, Play, History, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getApiKey, renderMarkdown, ToolCallDisplay } from './chat-utils';
import type { ToolCall } from './chat-utils';
import { useAnalysisLogs } from '@/hooks/useApi';
import type { AnalysisLogItem } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'analyzing' | 'complete' | 'chatting';

interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

interface MemberAnalysisPanelProps {
  email: string;
  displayName: string;
}

// ─── AnalysisHistoryItem ────────────────────────────────────────────────

function AnalysisHistoryItem({ log }: { log: AnalysisLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(log.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const period = log.periodFrom && log.periodTo
    ? `${log.periodFrom.split('T')[0]} 〜 ${log.periodTo.split('T')[0]}`
    : '';
  const preview = log.content.substring(0, 100).replace(/\n/g, ' ') + '...';

  return (
    <div className="analysis-history-item">
      <button className="analysis-history-header" onClick={() => setExpanded(!expanded)}>
        <span className="analysis-history-toggle">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="analysis-history-date">{date}</span>
        {period && <span className="analysis-history-period">{period}</span>}
        {!expanded && <span className="analysis-history-preview">{preview}</span>}
      </button>
      {expanded && (
        <div className="analysis-history-content md-content">
          <div className="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(log.content) }} />
        </div>
      )}
    </div>
  );
}

// ─── MemberAnalysisPanel ────────────────────────────────────────────────

export function MemberAnalysisPanel({ email, displayName }: MemberAnalysisPanelProps) {
  const [state, setState] = useState<PanelState>('idle');
  const [analysisContent, setAnalysisContent] = useState('');
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);
  const [input, setInput] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  // Period selection (default: last 30 days)
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultTo = now.toISOString().split('T')[0];
  const [periodFrom, setPeriodFrom] = useState(defaultFrom);
  const [periodTo, setPeriodTo] = useState(defaultTo);

  // Fetch analysis history
  const analysisLogs = useAnalysisLogs(email, 10);

  const scrollToBottom = useCallback(() => {
    contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [analysisContent, followUpMessages, toolCalls, scrollToBottom]);

  // Auto-run analysis on mount if no recent log (within 24h)
  useEffect(() => {
    if (analysisLogs.data && state === 'idle') {
      const logs = analysisLogs.data.data;
      if (logs.length > 0) {
        const latest = logs[0];
        const age = Date.now() - new Date(latest.createdAt).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          // Show cached result
          setAnalysisContent(latest.content);
          setState('complete');
          return;
        }
      }
      // Auto-trigger analysis
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisLogs.data]);

  // Cleanup socket
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const runAnalysis = useCallback(() => {
    setError(null);
    setAnalysisContent('');
    setToolCalls([]);
    setFollowUpMessages([]);
    setState('analyzing');

    const apiKey = getApiKey();
    const socket = io({
      path: '/socket.io',
      auth: { apiKey },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    let accumulated = '';

    socket.on('connect', () => {
      socket.emit('analysis:run', { email, periodFrom, periodTo });
    });

    socket.on('chat:text', (data: { content: string }) => {
      accumulated += data.content;
      setAnalysisContent(accumulated);
    });

    socket.on('chat:tool_use', (data: { toolName: string; args: string }) => {
      setToolCalls(prev => [...prev, { toolName: data.toolName, args: data.args, status: 'running' }]);
    });

    socket.on('chat:tool_result', (data: { toolName: string }) => {
      setToolCalls(prev => prev.map(tc =>
        tc.toolName === data.toolName && tc.status === 'running'
          ? { ...tc, status: 'done' as const }
          : tc
      ));
    });

    socket.on('analysis:saved', () => {
      // Refetch analysis logs
      queryClient.invalidateQueries({ queryKey: ['analysis-logs', email] });
    });

    socket.on('chat:done', () => {
      setState('complete');
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('chat:error', (data: { message: string }) => {
      setError(data.message);
      setState('idle');
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('connect_error', (err) => {
      setError(`接続エラー: ${err.message}`);
      setState('idle');
      socketRef.current = null;
    });
  }, [email, periodFrom, periodTo, queryClient]);

  const sendFollowUp = useCallback(() => {
    const text = input.trim();
    if (!text || isFollowUpLoading) return;

    setInput('');
    setError(null);
    setState('chatting');
    setIsFollowUpLoading(true);

    const userMsg: FollowUpMessage = { role: 'user', content: text };
    const newMessages = [...followUpMessages, userMsg];
    setFollowUpMessages(newMessages);

    // Add placeholder assistant message
    setFollowUpMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [] }]);

    const apiKey = getApiKey();
    const socket = io({
      path: '/socket.io',
      auth: { apiKey },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    let accumulatedContent = '';

    // Build messages array including the analysis context
    const chatMessages = [
      { role: 'assistant' as const, content: analysisContent },
      ...newMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    socket.on('connect', () => {
      socket.emit('chat:send', {
        messages: chatMessages,
        context: { type: 'member', email },
      });
    });

    socket.on('chat:text', (data: { content: string }) => {
      accumulatedContent += data.content;
      setFollowUpMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: accumulatedContent };
        return updated;
      });
    });

    socket.on('chat:tool_use', (data: { toolName: string; args: string }) => {
      setFollowUpMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const tc = [...(last.toolCalls || []), { toolName: data.toolName, args: data.args, status: 'running' as const }];
        updated[updated.length - 1] = { ...last, toolCalls: tc };
        return updated;
      });
    });

    socket.on('chat:tool_result', (data: { toolName: string }) => {
      setFollowUpMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const tc = (last.toolCalls || []).map(t =>
          t.toolName === data.toolName && t.status === 'running'
            ? { ...t, status: 'done' as const }
            : t
        );
        updated[updated.length - 1] = { ...last, toolCalls: tc };
        return updated;
      });
    });

    socket.on('chat:done', () => {
      setIsFollowUpLoading(false);
      inputRef.current?.focus();
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('chat:error', (data: { message: string }) => {
      setError(data.message);
      setIsFollowUpLoading(false);
      setFollowUpMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('connect_error', (err) => {
      setError(`接続エラー: ${err.message}`);
      setIsFollowUpLoading(false);
      socketRef.current = null;
    });
  }, [input, isFollowUpLoading, followUpMessages, analysisContent, email]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFollowUp();
    }
  };

  const isLoading = state === 'analyzing' || isFollowUpLoading;
  const logs = analysisLogs.data?.data || [];

  return (
    <div className="analysis-panel">
      {/* Header */}
      <div className="analysis-panel-header">
        <div className="analysis-panel-title">
          <Bot size={16} />
          <span>{displayName} の AI 分析レポート</span>
        </div>
        <div className="analysis-panel-controls">
          <div className="analysis-period-selector">
            <input
              type="date"
              value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)}
              className="analysis-date-input"
              disabled={isLoading}
            />
            <span style={{ color: 'var(--text-muted)' }}>〜</span>
            <input
              type="date"
              value={periodTo}
              onChange={e => setPeriodTo(e.target.value)}
              className="analysis-date-input"
              disabled={isLoading}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={isLoading}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            {state === 'analyzing'
              ? <><Loader2 size={12} className="chat-spinner" /> 分析中...</>
              : state === 'complete'
                ? <><RefreshCw size={12} /> 再分析</>
                : <><Play size={12} /> 分析開始</>}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="analysis-panel-body">
        {state === 'idle' && !analysisContent && (
          <div className="chat-empty" style={{ padding: '40px' }}>
            <Bot size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              パフォーマンスコーチ
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              期間を選択して「分析開始」をクリックしてください
            </div>
          </div>
        )}

        {/* Tool calls (during analysis) */}
        {toolCalls.length > 0 && (
          <div style={{ padding: '0 20px', marginTop: '12px' }}>
            <ToolCallDisplay toolCalls={toolCalls} />
          </div>
        )}

        {/* Analysis content */}
        {analysisContent && (
          <div className="analysis-content md-content">
            <div className="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisContent) }} />
          </div>
        )}

        {/* Analyzing spinner when no content yet */}
        {state === 'analyzing' && !analysisContent && toolCalls.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 size={24} className="chat-spinner" style={{ color: 'var(--accent)' }} />
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              データを収集して分析しています...
            </div>
          </div>
        )}

        {/* Follow-up messages */}
        {followUpMessages.length > 0 && (
          <div className="analysis-followup">
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 20px 4px' }}>
              フォローアップ
            </div>
            {followUpMessages.map((msg, i) => (
              <div key={i} className={`chat-message chat-message-${msg.role}`} style={{ padding: '0 20px', marginBottom: '12px' }}>
                <div className="chat-message-icon">
                  {msg.role === 'user'
                    ? <span style={{ fontSize: '10px', fontWeight: 700 }}>Q</span>
                    : <Bot size={14} />}
                </div>
                <div className="chat-message-content">
                  {msg.role === 'assistant' ? (
                    <>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <ToolCallDisplay toolCalls={msg.toolCalls} />
                      )}
                      {msg.content ? (
                        <div className="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      ) : (
                        isFollowUpLoading && i === followUpMessages.length - 1 && (!msg.toolCalls || msg.toolCalls.length === 0) && (
                          <Loader2 size={16} className="chat-spinner" />
                        )
                      )}
                    </>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="chat-error" style={{ margin: '12px 20px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div ref={contentEndRef} />
      </div>

      {/* Follow-up input (shown after analysis complete) */}
      {(state === 'complete' || state === 'chatting') && (
        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="フォローアップ質問を入力... (例: エラー率が高い原因は？)"
            rows={1}
            disabled={isFollowUpLoading}
            className="chat-input"
          />
          <button
            onClick={sendFollowUp}
            disabled={isFollowUpLoading || !input.trim()}
            className="chat-send-btn"
          >
            {isFollowUpLoading ? <Loader2 size={16} className="chat-spinner" /> : <Send size={16} />}
          </button>
        </div>
      )}

      {/* Analysis History */}
      {logs.length > 0 && (
        <div className="analysis-history">
          <button
            className="analysis-history-toggle-btn"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <History size={14} />
            <span>過去の分析履歴 ({logs.length}件)</span>
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {historyOpen && (
            <div className="analysis-history-list">
              {logs.map(log => (
                <AnalysisHistoryItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
