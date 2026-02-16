import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{title}</h1>
          {description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
