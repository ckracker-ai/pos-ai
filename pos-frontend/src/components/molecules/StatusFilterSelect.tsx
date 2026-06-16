'use client';

export type StatusFilterValue = 'all' | 'active' | 'inactive';

type StatusFilterSelectProps = {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  disabled?: boolean;
};

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

export function StatusFilterSelect({ value, onChange, disabled }: StatusFilterSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-brand-ink-muted">
      Estado
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as StatusFilterValue)}
        className="rounded-xl border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function matchesStatusFilter(
  isActive: boolean,
  filter: StatusFilterValue
): boolean {
  if (filter === 'active') return isActive;
  if (filter === 'inactive') return !isActive;
  return true;
}
