'use client';

import {
  formatWspTransferPreview,
  type TransferPreviewFields,
} from '@/core/utils/wspTransferMessage';

type Props = {
  fields: TransferPreviewFields;
  className?: string;
};

export function WspTransferPreview({ fields, className = '' }: Props) {
  const preview = formatWspTransferPreview(fields);

  return (
    <div
      className={`rounded-xl border border-brand-olive/20 bg-brand-vanilla/40 p-4 ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
        Vista previa WhatsApp (al confirmar)
      </p>
      <p className="mt-1 text-xs text-brand-ink-muted">
        Mismo texto que recibe el cliente y que usa la IA para validar comprobantes.
      </p>
      {preview ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-brand-linen bg-white p-3 font-sans text-sm leading-relaxed text-brand-ink">
          {preview}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-amber-800">
          Completa banco, tipo, cuenta, titular y RUT para habilitar el mensaje al cliente.
        </p>
      )}
    </div>
  );
}
