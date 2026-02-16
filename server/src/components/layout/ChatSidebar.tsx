'use client';

import { X } from 'lucide-react';
import { ChatPanel } from '@/components/shared/ChatPanel';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  return (
    <div className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="chat-sidebar-header">
        <div className="chat-sidebar-title">
          <span className="chat-sidebar-logo">AI</span>
          <span>分析チャット</span>
        </div>
        <button className="chat-sidebar-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <ChatPanel
        context={{ type: 'global' }}
        placeholder="チームの利用状況について質問..."
        height="calc(100vh - 60px)"
      />
    </div>
  );
}
