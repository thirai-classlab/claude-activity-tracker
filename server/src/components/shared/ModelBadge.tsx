import { shortModel, modelBadgeVariant } from '@/lib/formatters';

interface ModelBadgeProps {
  model: string | null | undefined;
}

export function ModelBadge({ model }: ModelBadgeProps) {
  const variant = modelBadgeVariant(model);
  const label = shortModel(model);

  const classMap = {
    opus: 'badge-opus',
    sonnet: 'badge-sonnet',
    haiku: 'badge-haiku',
    default: '',
  };

  return (
    <span
      className={classMap[variant]}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '999px',
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
