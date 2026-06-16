'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/core/interfaces';

export function ProductQuickPicker({
  products,
  selectedProductId,
  onSelect,
  resetKey = 0,
}: {
  products: Product[];
  selectedProductId: string;
  onSelect: (id: string) => void;
  resetKey?: number;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.sku ?? ''} ${p.category ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [products, query]);

  const displayValue = open ? query : selected?.name ?? query;

  return (
    <div className="relative" key={resetKey}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Buscar producto por nombre o SKU..."
        className="app-input w-full rounded-2xl px-4 py-3 text-brand-ink outline-none focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
      />

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-brand-linen bg-white shadow-lg">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(p.id);
                setQuery('');
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left transition hover:bg-brand-vainilla/90 ${
                p.id === selectedProductId ? 'bg-brand-olive/10' : ''
              }`}
            >
              <div className="text-sm font-semibold text-brand-ink">{p.name}</div>
              <div className="text-xs text-brand-ink-muted">
                {p.sku ? `SKU: ${p.sku}` : p.category}
                {typeof p.stock === 'number' ? ` · Stock: ${p.stock}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-brand-linen bg-white p-4 text-sm text-brand-ink-muted shadow-lg">
          Sin coincidencias
        </div>
      )}
    </div>
  );
}
