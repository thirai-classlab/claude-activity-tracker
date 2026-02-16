'use client';

import { useFilters } from '@/hooks/useFilters';
import { useFilterOptions } from '@/hooks/useApi';

export function SidebarFilters() {
  const { filters, setFilter, clearFilters, hasActiveFilters, isSaved } = useFilters();
  const { data: options } = useFilterOptions();

  return (
    <div className="sidebar-filters">
      <label htmlFor="filter-from">期間（開始）</label>
      <input
        id="filter-from"
        type="date"
        value={filters.from || ''}
        onChange={e => setFilter('from', e.target.value || undefined)}
      />

      <label htmlFor="filter-to">期間（終了）</label>
      <input
        id="filter-to"
        type="date"
        value={filters.to || ''}
        onChange={e => setFilter('to', e.target.value || undefined)}
      />

      <label htmlFor="filter-member">メンバー</label>
      <select
        id="filter-member"
        value={filters.member || ''}
        onChange={e => setFilter('member', e.target.value || undefined)}
      >
        <option value="">全メンバー</option>
        {options?.members.map(m => (
          <option key={m.gitEmail} value={m.gitEmail}>
            {m.displayName || m.gitEmail}
          </option>
        ))}
      </select>

      <label htmlFor="filter-repo">リポジトリ</label>
      <select
        id="filter-repo"
        value={filters.repo || ''}
        onChange={e => setFilter('repo', e.target.value || undefined)}
      >
        <option value="">全リポジトリ</option>
        {options?.repos.map(r => (
          <option key={r} value={r}>
            {r.replace(/\.git$/, '').split('/').pop() || r}
          </option>
        ))}
      </select>

      <label htmlFor="filter-model">モデル</label>
      <select
        id="filter-model"
        value={filters.model || ''}
        onChange={e => setFilter('model', e.target.value || undefined)}
      >
        <option value="">全モデル</option>
        {options?.models.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={clearFilters}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            フィルタをクリア
          </button>
        </div>
      )}

      {isSaved && hasActiveFilters && (
        <div className="filter-saved-badge">
          <span className="filter-saved-dot" />
          フィルタ保存済み
        </div>
      )}
    </div>
  );
}
