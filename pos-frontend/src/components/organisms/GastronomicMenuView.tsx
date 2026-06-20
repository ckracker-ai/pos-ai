'use client';

import { useMemo, useState } from 'react';

export type PublicMenuProduct = {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isFeatured: boolean;
  sortOrder: number;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  products: PublicMenuProduct[];
};

export type PublicMenuData = {
  title: string;
  subtitle: string | null;
  branchName: string;
  empresaNombre: string;
  categories: PublicMenuCategory[];
};

function formatClp(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

function dishEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/hamburg|burger/.test(n)) return '🍔';
  if (/pizza/.test(n)) return '🍕';
  if (/empanada/.test(n)) return '🥟';
  if (/sushi|roll/.test(n)) return '🍣';
  if (/café|cafe|coffee/.test(n)) return '☕';
  if (/bebida|jugo|agua/.test(n)) return '🥤';
  if (/postre|torta|helado/.test(n)) return '🍰';
  return '🍽️';
}

type Props = {
  menu: PublicMenuData;
};

export function GastronomicMenuView({ menu }: Props) {
  const categories = useMemo(
    () => [...menu.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [menu.categories]
  );
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');

  const activeCategory =
    categories.find((c) => c.id === activeCategoryId) ?? categories[0] ?? null;

  return (
    <div className="gastro-menu min-h-screen bg-[#f4f4f3] text-[#3d4532]">
      <header className="sticky top-0 z-20 border-b border-[#d1c7bd]/80 bg-[#4a533c] px-4 py-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Menú digital</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight">{menu.title}</h1>
        {menu.subtitle ? <p className="mt-1 text-sm text-white/85">{menu.subtitle}</p> : null}
        <p className="mt-2 text-xs text-white/70">📍 {menu.branchName}</p>
      </header>

      {categories.length > 1 ? (
        <nav className="sticky top-[7.5rem] z-10 flex gap-2 overflow-x-auto border-b border-[#d1c7bd]/60 bg-white/95 px-3 py-3 backdrop-blur">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCategory?.id === cat.id
                  ? 'bg-[#4a533c] text-white shadow-sm'
                  : 'border border-[#d1c7bd] bg-white text-[#6b7362] hover:border-[#4a533c]/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="mx-auto max-w-lg px-4 py-5 pb-10">
        {activeCategory ? (
          <section>
            <div className="mb-4">
              <h2 className="font-serif text-xl font-semibold text-[#4a533c]">{activeCategory.name}</h2>
              {activeCategory.description ? (
                <p className="mt-1 text-sm text-[#6b7362]">{activeCategory.description}</p>
              ) : null}
            </div>

            <ul className="space-y-3">
              {activeCategory.products.map((product) => (
                <li
                  key={product.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_24px_rgba(74,83,60,0.08)] ${
                    product.isFeatured
                      ? 'border-[#4a533c]/35 ring-1 ring-[#4a533c]/15'
                      : 'border-[#d1c7bd]/70'
                  }`}
                >
                  <div className="flex gap-3 p-4">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl ${
                        product.isFeatured ? 'bg-[#4a533c]/10' : 'bg-[#f4f4f3]'
                      }`}
                      aria-hidden
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        dishEmoji(product.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug text-[#3d4532]">{product.name}</h3>
                        {product.isFeatured ? (
                          <span className="shrink-0 rounded-full bg-[#4a533c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Destacado
                          </span>
                        ) : null}
                      </div>
                      {product.description ? (
                        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[#6b7362]">
                          {product.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-lg font-bold text-[#4a533c]">{formatClp(product.price)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {activeCategory.products.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d1c7bd] bg-white/70 px-4 py-8 text-center text-sm text-[#6b7362]">
                Esta categoría aún no tiene platos publicados.
              </p>
            ) : null}
          </section>
        ) : (
          <p className="rounded-xl border border-dashed border-[#d1c7bd] bg-white/70 px-4 py-10 text-center text-sm text-[#6b7362]">
            El menú se está preparando. Vuelve en unos minutos.
          </p>
        )}
      </main>

      <footer className="border-t border-[#d1c7bd]/60 bg-white px-4 py-4 text-center text-xs text-[#6b7362]">
        Menú servido con <span className="font-semibold text-[#4a533c]">POS-AI</span>
      </footer>
    </div>
  );
}
