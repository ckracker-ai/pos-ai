'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  version: string;
  contentMd: string;
  /** Sin tarjeta exterior — para modales. */
  embedded?: boolean;
};

function renderMarkdownLite(md: string): ReactNode[] {
  return md.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={`br-${i}`} />;
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={i} className="mb-4 text-2xl font-bold text-brand-ink">
          {trimmed.slice(2)}
        </h1>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="mb-2 mt-6 text-lg font-semibold text-brand-olive">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
      return (
        <p key={i} className="mt-6 text-sm italic text-brand-ink-muted">
          {trimmed.slice(1, -1)}
        </p>
      );
    }
    return (
      <p key={i} className="mb-2 text-sm leading-relaxed text-brand-ink">
        {trimmed}
      </p>
    );
  });
}

export function LegalDocumentView({ title, version, contentMd, embedded = false }: Props) {
  if (embedded) {
    return <div className="px-4">{renderMarkdownLite(contentMd)}</div>;
  }

  return (
    <article className="app-card mx-auto max-w-3xl rounded-2xl p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-olive">Documento legal</p>
      <h1 className="mt-2 text-2xl font-bold text-brand-ink">{title}</h1>
      <p className="mt-1 text-sm text-brand-ink-muted">Versión {version}</p>
      <div className="mt-8">{renderMarkdownLite(contentMd)}</div>
    </article>
  );
}
