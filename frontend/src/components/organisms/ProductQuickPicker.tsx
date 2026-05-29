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
        className="w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
      />

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950/95 shadow-lg">
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
              className={`w-full text-left px-4 py-3 hover:bg-slate-900/90 transition ${
                p.id === selectedProductId ? 'bg-slate-900/80' : ''
              }`}
            >
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-xs text-slate-400">
                {p.sku ? `SKU: ${p.sku}` : p.category}
                {typeof p.stock === 'number' ? ` · Stock: ${p.stock}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-3xl border border-slate-800 bg-slate-950/95 p-4 text-sm text-slate-400">
          Sin coincidencias
        </div>
      )}
    </div>
  );
}
