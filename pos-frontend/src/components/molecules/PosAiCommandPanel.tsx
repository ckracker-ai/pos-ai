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
import {
  buildPosQuickActions,
  formatPosProductOptionLabel,
  normalizePosVoiceCommand,
  posAiInputPlaceholder,
  type PosAssistProduct,
} from '@/core/pos/posSaleAssist';
import { parsePositiveInt, sanitizeDigitsOnly } from '@/core/utils/numeric-input';
import type { PosAiResult } from '@/core/pos/posAiTypes';

export type PosAiCommandPanelHandle = {
  focusInput: () => void;
};

type Props = {
  disabled?: boolean;
  loading?: boolean;
  lastResult?: PosAiResult | null;
  products: PosAssistProduct[];
  onSubmit: (text: string) => void | Promise<void>;
  onQuickAdd: (productId: string, quantity: number) => void;
};

export const PosAiCommandPanel = forwardRef<PosAiCommandPanelHandle, Props>(
  function PosAiCommandPanel(
    { disabled, loading, lastResult, products, onSubmit, onQuickAdd },
    ref
  ) {
    const [text, setText] = useState('');
    const [optionQty, setOptionQty] = useState<Record<string, string>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    const productOptions = lastResult?.product_options ?? [];
    const pendingQuantity = lastResult?.pending_quantity ?? 1;
    const showProductPicker = productOptions.length > 0;

    const quickActions = useMemo(() => buildPosQuickActions(products), [products]);
    const inputPlaceholder = useMemo(() => posAiInputPlaceholder(products), [products]);

    useImperativeHandle(ref, () => ({
      focusInput: () => inputRef.current?.focus(),
    }));

    const appendTranscript = useCallback(
      async (transcript: string) => {
        const command = normalizePosVoiceCommand(transcript);
        if (!command || loading || disabled) return;
        await onSubmit(command);
        setText('');
        inputRef.current?.focus();
      },
      [disabled, loading, onSubmit]
    );

    const { listening, supported, lastHeard, speechError, toggleListen } =
      usePosSpeechInput(appendTranscript);

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

    const productById = useMemo(
      () => new Map(products.map((p) => [p.id, p])),
      [products]
    );

    const resolveOptionCategory = useCallback(
      (option: (typeof productOptions)[number]) =>
        option.categoria?.trim() || productById.get(option.id)?.category?.trim() || '',
      [productById]
    );

    const optionPeers = useMemo(
      () =>
        productOptions.map((o) => ({
          nombre: o.nombre,
          precio: o.precio,
          categoria: resolveOptionCategory(o),
        })),
      [productOptions, resolveOptionCategory]
    );

    const getOptionQtyText = (productId: string) =>
      optionQty[productId] ?? String(pendingQuantity);

    const resolveQty = (raw: string) => parsePositiveInt(raw) ?? 1;

    useEffect(() => {
      if (!showProductPicker) return;
      setOptionQty((prev) => {
        const next = { ...prev };
        for (const option of productOptions) {
          if (next[option.id] == null) next[option.id] = String(pendingQuantity);
        }
        return next;
      });
    }, [productOptions, pendingQuantity, showProductPicker]);

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
              Busca en tu catálogo, agrega, quita o cierra la venta. Los ejemplos usan productos de esta
              sucursal.
            </p>
            <p className="mt-1 text-xs text-brand-ink-muted">
              Atajo{' '}
              <kbd className="rounded border border-brand-linen bg-white px-1.5 py-0.5 font-mono text-[10px]">
                F2
              </kbd>{' '}
              · La IA usa el catálogo y stock de tu empresa en esta sucursal
            </p>
          </div>
          {supported ? (
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
          ) : (
            <p className="max-w-[11rem] text-right text-[10px] leading-snug text-brand-ink-muted">
              Voz no disponible en este navegador (p. ej. iPhone). Escribe el comando.
            </p>
          )}
        </div>

        {lastHeard && !listening && (
          <p className="mt-2 text-xs text-brand-ink-muted">
            <span className="font-semibold text-brand-olive">Escuché:</span> «{lastHeard}» → «
            {normalizePosVoiceCommand(lastHeard)}»
          </p>
        )}
        {speechError && (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {speechError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">Comando de venta</span>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled || loading}
              placeholder={inputPlaceholder}
              className="app-input w-full"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={disabled || loading}
                onClick={() => setText(action.command)}
                title={action.command}
                className="rounded-full border border-[rgba(74,83,60,0.2)] bg-brand-surface/80 px-3 py-1 text-xs text-brand-ink-muted transition hover:border-brand-olive hover:text-brand-ink disabled:opacity-50"
              >
                {action.label}
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

        {showProductPicker && (
          <div className="mt-5 border-t border-brand-linen/80 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-olive">
              Elige producto
            </p>
            <p className="mt-1 text-xs app-text-muted">
              Elige variante, ajusta cantidad y agrega. Puedes sumar varios de la lista.
            </p>
            <ul className="mt-3 space-y-2">
              {productOptions.map((option) => (
                <li
                  key={option.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-olive/30 bg-brand-vanilla/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink">
                      {formatPosProductOptionLabel(
                        {
                          name: option.nombre,
                          category: resolveOptionCategory(option),
                          price: option.precio,
                          sku: option.sku || productById.get(option.id)?.sku,
                        },
                        optionPeers
                      )}
                    </p>
                    <p className="text-xs app-text-muted">
                      ${option.precio.toLocaleString('es-CL')} · {option.stock_actual} u. disponibles
                    </p>
                  </div>
                  <label className="flex items-center gap-1 text-xs app-text-muted">
                    Cant.
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getOptionQtyText(option.id)}
                      onChange={(e) =>
                        setOptionQty((prev) => ({
                          ...prev,
                          [option.id]: sanitizeDigitsOnly(e.target.value),
                        }))
                      }
                      className="app-input w-14 py-1 text-center text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onQuickAdd(option.id, resolveQty(getOptionQtyText(option.id)))}
                    className="rounded-xl border-2 border-brand-olive bg-white px-4 py-2 text-xs font-bold text-brand-olive shadow-md transition hover:bg-brand-vanilla disabled:opacity-50"
                  >
                    + Agregar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </section>
    );
  }
);
