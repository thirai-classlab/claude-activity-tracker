'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Coins, Users, Clock, GitBranch, MessageSquare,
} from 'lucide-react';
import { SidebarFilters } from './SidebarFilters';

const TEAM_LINKS = [
  { href: '/', label: '概要・AI分析', icon: LayoutDashboard },
  { href: '/tokens', label: 'トークン分析', icon: Coins },
  { href: '/members', label: 'メンバー', icon: Users },
];

const PERSONAL_LINKS = [
  { href: '/sessions', label: 'セッション', icon: Clock },
  { href: '/repos', label: 'リポジトリ', icon: GitBranch },
  { href: '/prompt-feed', label: 'プロンプトフィード', icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark">AIDD</span>
          <span className="sidebar-logo-text">Analytics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <span className="persona-dot team" />
          チーム
        </div>
        {TEAM_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href) ? 'active' : ''}
          >
            <link.icon size={16} />
            {link.label}
          </Link>
        ))}

        <div className="sidebar-section">
          <span className="persona-dot personal" />
          パーソナル
        </div>
        {PERSONAL_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href) ? 'active' : ''}
          >
            <link.icon size={16} />
            {link.label}
          </Link>
        ))}
      </nav>

      <SidebarFilters />
    </aside>
  );
}
