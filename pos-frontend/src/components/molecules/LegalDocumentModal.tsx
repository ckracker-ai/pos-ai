'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LegalDocumentView } from '@/components/molecules/LegalDocumentView';

type LegalDocumentModalProps = {
  open: boolean;
  title: string;
  version: string;
  contentMd: string;
  onClose: () => void;
};

export function LegalDocumentModal({
  open,
  title,
  version,
  contentMd,
  onClose,
}: LegalDocumentModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="app-modal-overlay !z-[200]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal-panel w-full max-w-2xl overflow-hidden rounded-[1.5rem] p-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-linen/80 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-olive">
              Documento legal
            </p>
            <h2 id="legal-modal-title" className="mt-1 text-lg font-semibold text-brand-ink">
              {title}
            </h2>
            <p className="text-xs text-brand-ink-muted">Versión {version}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-linen px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:border-brand-olive hover:bg-brand-surface"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-2 py-4">
          <LegalDocumentView title={title} version={version} contentMd={contentMd} embedded />
        </div>

        <div className="border-t border-brand-linen/80 bg-brand-surface/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-olive py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d4532]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
