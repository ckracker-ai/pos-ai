import type { ReactNode } from 'react';

type AppPageHeaderProps = {
  /** Etiqueta superior (ej. rol o módulo) */
  kicker?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Meta bajo el título (usuario, sucursal, etc.) */
  meta?: ReactNode;
};

/** Encabezado unificado del ERP tenant — familia visual con landing y plataforma. */
export function AppPageHeader({ kicker, title, description, actions, meta }: AppPageHeaderProps) {
  return (
    <header className="mb-8">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-olive">{kicker}</p>
      ) : null}
      <div className={`flex flex-wrap items-start justify-between gap-3 ${kicker ? 'mt-2' : ''}`}>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-semibold text-brand-ink">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-brand-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-4 text-sm text-brand-ink-muted">{meta}</div> : null}
    </header>
  );
}
