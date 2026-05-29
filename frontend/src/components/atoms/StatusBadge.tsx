'use client';

export function StatusBadge({
  active,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-[4.75rem] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
        active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
