'use client';

import {
  buildPosSuggestions,
  suggestionReasonLabel,
  type PosAssistCartLine,
  type PosAssistProduct,
  type PosSuggestion,
} from '@/core/pos/posSaleAssist';

export function PosSaleAssistPanel({
  cart,
  products,
  onQuickAdd,
}: {
  cart: PosAssistCartLine[];
  products: PosAssistProduct[];
  onQuickAdd: (productId: string) => void;
}) {
  const suggestions: PosSuggestion[] = buildPosSuggestions({ cart, products, max: 6 });

  if (suggestions.length === 0) {
    return (
      <section className="app-card rounded-3xl border border-dashed border-[rgba(74,83,60,0.2)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-olive">Asistente caja</p>
        <p className="mt-2 text-sm app-text-muted">
          Agrega productos al carrito para ver sugerencias según familia y stock.
        </p>
      </section>
    );
  }

  return (
    <section className="app-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-olive">Asistente caja</p>
          <p className="mt-1 text-sm app-text-muted">
            Sugerencias según lo que llevas — un clic para sumar al carrito.
          </p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <li key={s.productId}>
            <button
              type="button"
              onClick={() => onQuickAdd(s.productId)}
              className="rounded-2xl border border-[rgba(74,83,60,0.2)] bg-[rgba(74,83,60,0.06)] px-3 py-2 text-left text-sm transition hover:border-brand-olive hover:bg-[rgba(74,83,60,0.12)]"
            >
              <span className="font-semibold text-brand-ink">{s.name}</span>
              <span className="mt-0.5 block text-xs app-text-muted">
                ${s.price.toLocaleString('es-CL')} · {suggestionReasonLabel(s.reason)} · {s.stock} u.
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
