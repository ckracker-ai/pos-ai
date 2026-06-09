'use client';

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({ page, pageSize, totalItems, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(209,199,189,0.5)] px-4 py-3">
      <p className="text-xs text-[#6b7280]">
        {totalItems === 0
          ? 'Sin registros'
          : `Mostrando ${start}–${end} de ${totalItems}`}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="rounded-xl border border-[rgba(74,83,60,0.25)] bg-white px-3 py-1.5 text-xs font-semibold text-[#3d4532] transition hover:bg-[rgba(74,83,60,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="min-w-[4.5rem] text-center text-xs font-medium text-[#5c6650]">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            className="rounded-xl border border-[rgba(74,83,60,0.25)] bg-white px-3 py-1.5 text-xs font-semibold text-[#3d4532] transition hover:bg-[rgba(74,83,60,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

export function paginateList<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  };
}
