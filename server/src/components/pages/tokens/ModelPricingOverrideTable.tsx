'use client';

/**
 * Admin UI — Manual pricing override table.
 *
 * Spec: docs/specs/002-model-pricing-registry.md
 * Task: docs/tasks/phase-2-t11.md
 *
 * Lets operators:
 *   - list every row in `model_pricing` with its `source`
 *   - add or update a `manual_override` row via the form
 *   - delete an existing `manual_override` (restores the litellm-synced value)
 *
 * Validation is intentionally minimal (non-empty modelId + non-negative
 * numbers). Server-side `OverrideValidationError` provides the final guard.
 */

import { useState, type FormEvent } from 'react';
import {
  useModels,
  useUpsertModelOverride,
  useDeleteModelOverride,
} from '@/hooks/useApi';
import type { ModelInfo } from '@/lib/types';

interface FormState {
  modelId: string;
  family: string;
  tier: string;
  inputPerMtok: string;
  outputPerMtok: string;
  cacheWritePerMtok: string;
  cacheReadPerMtok: string;
}

const EMPTY_FORM: FormState = {
  modelId: '',
  family: '',
  tier: 'standard',
  inputPerMtok: '',
  outputPerMtok: '',
  cacheWritePerMtok: '',
  cacheReadPerMtok: '',
};

function parsePositiveNumber(value: string, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${field} は 0 以上の数値を入力してください`);
  }
  return num;
}

function sourceBadgeColor(source: string): string {
  if (source === 'manual_override') return 'var(--primary, #6366f1)';
  if (source === 'litellm') return 'var(--success, #16a34a)';
  if (source === 'models_dev') return 'var(--warning, #d97706)';
  return 'var(--text-muted, #6b7280)';
}

export function ModelPricingOverrideTable() {
  const { data, isLoading, isError, refetch } = useModels(true);
  const upsert = useUpsertModelOverride();
  const remove = useDeleteModelOverride();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    try {
      const modelId = form.modelId.trim();
      if (modelId.length === 0) {
        throw new Error('modelId は必須です');
      }
      const payload = {
        modelId,
        family: form.family.trim() || undefined,
        tier: form.tier.trim() || undefined,
        inputPerMtok: parsePositiveNumber(form.inputPerMtok, 'input'),
        outputPerMtok: parsePositiveNumber(form.outputPerMtok, 'output'),
        cacheWritePerMtok: parsePositiveNumber(form.cacheWritePerMtok, 'cache_w'),
        cacheReadPerMtok: parsePositiveNumber(form.cacheReadPerMtok, 'cache_r'),
      };
      await upsert.mutateAsync(payload);
      setForm(EMPTY_FORM);
      setSuccessMessage(`${modelId} のオーバーライドを保存しました`);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message);
    }
  }

  async function handleDelete(modelId: string) {
    setFormError(null);
    setSuccessMessage(null);
    try {
      await remove.mutateAsync(modelId);
      setSuccessMessage(`${modelId} のオーバーライドを削除しました`);
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message);
    }
  }

  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>料金情報を読み込み中...</p>;
  }
  if (isError || !data) {
    return (
      <p role="alert" style={{ color: 'var(--danger)' }}>
        料金レジストリの取得に失敗しました。
      </p>
    );
  }

  const rows: ModelInfo[] = data.models;
  const sorted = [...rows].sort((a, b) => {
    // manual_override first, then by family/tier/modelId
    if (a.source === 'manual_override' && b.source !== 'manual_override') return -1;
    if (b.source === 'manual_override' && a.source !== 'manual_override') return 1;
    return (
      a.family.localeCompare(b.family) ||
      a.tier.localeCompare(b.tier) ||
      a.modelId.localeCompare(b.modelId)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <form
        onSubmit={handleSubmit}
        aria-label="料金オーバーライド追加フォーム"
        style={{
          display: 'grid',
          gap: '0.5rem 0.75rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          padding: '0.75rem',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          background: 'var(--surface-soft, transparent)',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>modelId *</span>
          <input
            type="text"
            required
            value={form.modelId}
            onChange={(e) => update('modelId', e.target.value)}
            placeholder="claude-opus-4-7"
            aria-label="modelId"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>family</span>
          <input
            type="text"
            value={form.family}
            onChange={(e) => update('family', e.target.value)}
            placeholder="opus / sonnet / haiku"
            aria-label="family"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>tier</span>
          <input
            type="text"
            value={form.tier}
            onChange={(e) => update('tier', e.target.value)}
            aria-label="tier"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>input $/Mtok *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={form.inputPerMtok}
            onChange={(e) => update('inputPerMtok', e.target.value)}
            aria-label="inputPerMtok"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>output $/Mtok *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={form.outputPerMtok}
            onChange={(e) => update('outputPerMtok', e.target.value)}
            aria-label="outputPerMtok"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>cache_w $/Mtok *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={form.cacheWritePerMtok}
            onChange={(e) => update('cacheWritePerMtok', e.target.value)}
            aria-label="cacheWritePerMtok"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
          <span>cache_r $/Mtok *</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={form.cacheReadPerMtok}
            onChange={(e) => update('cacheReadPerMtok', e.target.value)}
            aria-label="cacheReadPerMtok"
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button
            type="submit"
            disabled={upsert.isPending}
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '13px',
              fontWeight: 600,
              cursor: upsert.isPending ? 'wait' : 'pointer',
            }}
          >
            {upsert.isPending ? '保存中...' : '追加 / 更新'}
          </button>
        </div>
      </form>

      {formError && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>
          {formError}
        </p>
      )}
      {successMessage && (
        <p style={{ color: 'var(--success)', fontSize: '13px', margin: 0 }}>{successMessage}</p>
      )}

      <table className="data-table" aria-label="モデル料金一覧">
        <thead>
          <tr>
            <th>modelId</th>
            <th>family</th>
            <th>tier</th>
            <th style={{ textAlign: 'right' }}>input</th>
            <th style={{ textAlign: 'right' }}>output</th>
            <th style={{ textAlign: 'right' }}>cache_w</th>
            <th style={{ textAlign: 'right' }}>cache_r</th>
            <th>source</th>
            <th style={{ textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr
              key={m.modelId}
              style={
                m.deprecated ? { opacity: 0.5 } : undefined
              }
            >
              <td style={{ fontFamily: 'monospace' }}>
                {m.modelId}
                {m.deprecated && <span style={{ marginLeft: '0.5rem', fontSize: '11px', color: 'var(--text-muted)' }}>(deprecated)</span>}
              </td>
              <td>{m.family}</td>
              <td>{m.tier}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.inputPerMtok}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.outputPerMtok}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.cacheWritePerMtok}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.cacheReadPerMtok}</td>
              <td>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: sourceBadgeColor(m.source),
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  {m.source}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                {m.source === 'manual_override' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(m.modelId)}
                    disabled={remove.isPending}
                    aria-label={`${m.modelId} のオーバーライドを削除`}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '12px',
                      color: 'var(--danger)',
                      cursor: remove.isPending ? 'wait' : 'pointer',
                    }}
                  >
                    削除
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
