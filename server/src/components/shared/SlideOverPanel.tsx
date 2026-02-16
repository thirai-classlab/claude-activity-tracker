'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SlideOverPanel({ isOpen, onClose, title, children }: SlideOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`slide-over-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`slide-over-panel ${isOpen ? 'open' : ''}`}
      >
        <div className="slide-over-header">
          <span className="slide-over-title">{title}</span>
          <button className="slide-over-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="slide-over-body">
          {children}
        </div>
      </div>
    </>
  );
}
