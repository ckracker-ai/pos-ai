import type { ReactNode } from 'react';

type PlatformPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PlatformPageHeader({ title, description, actions }: PlatformPageHeaderProps) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">Plataforma POS-AI</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-brand-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
