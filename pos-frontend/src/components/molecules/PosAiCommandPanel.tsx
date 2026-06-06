'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { usePosSpeechInput } from '@/core/pos/usePosSpeechInput';
import { formatPosAiSummary } from '@/core/pos/posAiLabels';
import {
  buildPosSuggestions,
  suggestionReasonLabel,
  type PosAssistCartLine,
  type PosAssistProduct,
  type PosSuggestion,
} from '@/core/pos/posSaleAssist';
import { coercePositiveIntInput } from '@/core/utils/numeric-input';
import type { PosAiResult } from '@/core/pos/posAiTypes';

const EXAMPLES = [
  'pino, cafe tradicional, 2 queso',
  'deja 3 cafe tradicional',
  'quitar',
  'quita empanda de pino',
  'vaciar carrito',
];

export type PosAiCommandPanelHandle = {
  focusInput: () => void;
};

type Props = {
  disabled?: boolean;
  loading?: boolean;
  lastResult?: PosAiResult | null;
  cart: PosAssistCartLine[];
  products: PosAssistProduct[];
  onSubmit: (text: string) => void | Promise<void>;
  onQuickAdd: (productId: string, quantity: number) => void;
};

export const PosAiCommandPanel = forwardRef<PosAiCommandPanelHandle, Props>(
  function PosAiCommandPanel(
    { disabled, loading, lastResult, cart, products, onSubmit, onQuickAdd },
    ref
  ) {
    const [text, setText] = useState('');
    const [suggestionQty, setSuggestionQty] = useState<Record<string, number>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions: PosSuggestion[] = useMemo(
      () => buildPosSuggestions({ cart, products, max: 6 }),
      [cart, products]
    );

    useImperativeHandle(ref, () => ({
      focusInput: () => inputRef.current?.focus(),
    }));

    const appendTranscript = useCallback((transcript: string) => {
      setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      inputRef.current?.focus();
    }, []);

    const { listening, supported, toggleListen } = usePosSpeechInput(appendTranscript);

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F2') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const getSuggestionQty = (productId: string) => suggestionQty[productId] ?? 1;

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || loading || disabled) return;
      await onSubmit(trimmed);
      setText('');
    };

    return (
      <section className="app-card rounded-3xl border border-brand-olive/25 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-olive">POS IA</p>
            <p className="mt-1 text-sm app-text-muted">
              Habla o escribe como en el mostrador: agregar, cambiar cantidad, quitar o cerrar venta.
            </p>
            <p className="mt-1 text-xs text-brand-ink-muted">
              Atajo{' '}
              <kbd className="rounded border border-brand-linen bg-white px-1.5 py-0.5 font-mono text-[10px]">
                F2
              </kbd>{' '}
              · La IA usa el catálogo y stock de tu empresa en esta sucursal
            </p>
          </div>
          {supported && (
            <button
              type="button"
              onClick={toggleListen}
              disabled={disabled || loading}
              className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                listening
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-brand-olive/30 bg-brand-vanilla/60 text-brand-ink hover:border-brand-olive'
              }`}
            >
              {listening ? '● Escuchando…' : '🎤 Voz'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">Comando de venta</span>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled || loading}
              placeholder='Ej: "agrega 2 cafe tradicional"'
              className="app-input w-full"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={disabled || loading}
                onClick={() => setText(ex)}
                className="rounded-full border border-[rgba(74,83,60,0.2)] bg-brand-surface/80 px-3 py-1 text-xs text-brand-ink-muted transition hover:border-brand-olive hover:text-brand-ink disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={disabled || loading || !text.trim()}
            className="app-btn-primary w-full rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Interpretando…' : 'Ejecutar comando'}
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-5 border-t border-brand-linen/80 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
              Sugerencias para tu venta
            </p>
            <p className="mt-1 text-xs app-text-muted">
              Elige cantidad y agrega con un clic — aprende de lo que llevas en el carrito.
            </p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (
                <li
                  key={s.productId}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgba(74,83,60,0.15)] bg-brand-surface/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink">{s.name}</p>
                    <p className="text-xs app-text-muted">
                      ${s.price.toLocaleString('es-CL')} · {suggestionReasonLabel(s.reason)} · {s.stock} u.
                    </p>
                  </div>
                  <label className="flex items-center gap-1 text-xs app-text-muted">
                    Cant.
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getSuggestionQty(s.productId)}
                      onChange={(e) =>
                        setSuggestionQty((prev) => ({
                          ...prev,
                          [s.productId]: coercePositiveIntInput(e.target.value),
                        }))
                      }
                      className="app-input w-14 py-1 text-center text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onQuickAdd(s.productId, getSuggestionQty(s.productId))}
                    className="rounded-xl bg-[rgba(74,83,60,0.12)] px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-[rgba(74,83,60,0.2)] disabled:opacity-50"
                  >
                    + Agregar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastResult && (
          <p className="mt-4 rounded-xl border border-brand-linen/80 bg-brand-surface/50 px-3 py-2 text-xs text-brand-ink-muted">
            <span className="font-semibold text-brand-olive">Último comando:</span>{' '}
            {formatPosAiSummary(lastResult)}
            {lastResult.response_message ? (
              <span className="mt-1 block text-brand-ink">{lastResult.response_message}</span>
            ) : null}
          </p>
        )}
      </section>
    );
  }
);
