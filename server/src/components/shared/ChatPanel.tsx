'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { getApiKey, renderMarkdown, ToolCallDisplay } from './chat-utils';
import type { ToolCall } from './chat-utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

interface ChatPanelProps {
  context?: {
    type: 'global' | 'member';
    email?: string;
  };
  initialMessage?: string;
  placeholder?: string;
  height?: string;
}

// ─── ChatPanel ──────────────────────────────────────────────────────────

export function ChatPanel({ context, initialMessage, placeholder, height = '500px' }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState(initialMessage || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMessage: ChatMessageItem = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMsg: ChatMessageItem = { role: 'assistant', content: '', toolCalls: [] };
    setMessages(prev => [...prev, assistantMsg]);

    const apiKey = getApiKey();
    const socket = io({
      path: '/socket.io',
      auth: { apiKey },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    let accumulatedContent = '';

    socket.on('connect', () => {
      socket.emit('chat:send', { messages: newMessages, context });
    });

    socket.on('chat:text', (data: { content: string }) => {
      accumulatedContent += data.content;
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: accumulatedContent };
        return updated;
      });
    });

    socket.on('chat:tool_use', (data: { toolName: string; args: string }) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const toolCalls = [...(last.toolCalls || []), { toolName: data.toolName, args: data.args, status: 'running' as const }];
        updated[updated.length - 1] = { ...last, toolCalls };
        return updated;
      });
    });

    socket.on('chat:tool_result', (data: { toolName: string }) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const toolCalls = (last.toolCalls || []).map(tc =>
          tc.toolName === data.toolName && tc.status === 'running'
            ? { ...tc, status: 'done' as const }
            : tc
        );
        updated[updated.length - 1] = { ...last, toolCalls };
        return updated;
      });
    });

    socket.on('chat:done', () => {
      setIsLoading(false);
      inputRef.current?.focus();
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('chat:error', (data: { message: string }) => {
      setError(data.message);
      setIsLoading(false);
      setMessages(prev => {
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
      setIsLoading(false);
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      socketRef.current = null;
    });
  }, [input, isLoading, messages, context]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-panel" style={{ height }}>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Bot size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              AI 分析アシスタント
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {context?.type === 'member'
                ? 'このメンバーの利用状況について質問できます'
                : 'チーム全体の利用状況について質問できます'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-message-icon">
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
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
                    isLoading && i === messages.length - 1 && (!msg.toolCalls || msg.toolCalls.length === 0) && (
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

        {error && (
          <div className="chat-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'メッセージを入力... (Shift+Enter で改行)'}
          rows={1}
          disabled={isLoading}
          className="chat-input"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="chat-send-btn"
        >
          {isLoading ? <Loader2 size={16} className="chat-spinner" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
