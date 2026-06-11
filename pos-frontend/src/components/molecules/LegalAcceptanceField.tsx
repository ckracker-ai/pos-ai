'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  fetchPublicLegalCurrentClient,
  type PublicLegalCurrent,
} from '@/core/api/public-legal';
import { LegalDocumentModal } from '@/components/molecules/LegalDocumentModal';

type LegalDocKind = 'terms' | 'privacy';

type LegalAcceptanceFieldProps = {
  initialLegal: PublicLegalCurrent | null;
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  onLegalReady?: (legal: PublicLegalCurrent | null) => void;
};

function LegalDocTrigger({
  label,
  disabled,
  onOpen,
}: {
  label: string;
  disabled?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      className="inline border-0 bg-transparent p-0 font-semibold text-brand-olive underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function LegalAcceptanceField({
  initialLegal,
  accepted,
  onAcceptedChange,
  onLegalReady,
}: LegalAcceptanceFieldProps) {
  const checkboxId = useId();
  const [legal, setLegal] = useState<PublicLegalCurrent | null>(initialLegal);
  const [loading, setLoading] = useState(!initialLegal);
  const [loadError, setLoadError] = useState('');
  const [openDoc, setOpenDoc] = useState<LegalDocKind | null>(null);

  const loadLegal = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const data = await fetchPublicLegalCurrentClient();
    setLegal(data);
    if (!data) {
      setLoadError('No se pudieron cargar los documentos legales. Revisa tu conexión o intenta de nuevo.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialLegal?.terms?.contentMd && initialLegal?.privacy?.contentMd) {
      setLegal(initialLegal);
      setLoading(false);
      return;
    }
    void loadLegal();
  }, [initialLegal, loadLegal]);

  useEffect(() => {
    onLegalReady?.(legal);
  }, [legal, onLegalReady]);

  const openDocument = (kind: LegalDocKind) => {
    if (!legal) return;
    setOpenDoc(kind);
  };

  const activeDoc =
    openDoc === 'terms'
      ? legal?.terms
      : openDoc === 'privacy'
        ? legal?.privacy
        : null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start gap-3 rounded-xl border border-brand-linen/80 bg-brand-surface/30 px-4 py-3 text-sm text-brand-ink">
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-linen accent-brand-olive"
            checked={accepted}
            onChange={(e) => onAcceptedChange(e.target.checked)}
            disabled={!legal || loading}
            required
          />
          <div className="leading-relaxed">
            <label htmlFor={checkboxId} className="cursor-pointer">
              He leído y acepto los
            </label>{' '}
            <LegalDocTrigger
              label="Términos de Servicio"
              disabled={!legal?.terms?.contentMd || loading}
              onOpen={() => openDocument('terms')}
            />{' '}
            y la{' '}
            <LegalDocTrigger
              label="Política de Privacidad"
              disabled={!legal?.privacy?.contentMd || loading}
              onOpen={() => openDocument('privacy')}
            />
            {legal ? (
              <span className="mt-1 block text-xs text-brand-ink-muted">
                Versión {legal.terms.version} / {legal.privacy.version}
              </span>
            ) : loading ? (
              <span className="mt-1 block text-xs text-amber-800">Cargando documentos legales…</span>
            ) : (
              <span className="mt-1 block text-xs text-red-700">{loadError}</span>
            )}
          </div>
        </div>

        {!legal && !loading ? (
          <button
            type="button"
            onClick={() => void loadLegal()}
            className="text-xs font-semibold text-brand-olive hover:underline"
          >
            Reintentar carga de documentos
          </button>
        ) : null}
      </div>

      {activeDoc?.contentMd ? (
        <LegalDocumentModal
          open={openDoc !== null}
          title={activeDoc.title}
          version={activeDoc.version}
          contentMd={activeDoc.contentMd}
          onClose={() => setOpenDoc(null)}
        />
      ) : null}
    </>
  );
}
