'use client';

type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabListProps<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
};

export function TabList<T extends string>({ tabs, active, onChange, className = '' }: TabListProps<T>) {
  return (
    <div
      className={`flex flex-wrap gap-1 rounded-xl border border-brand-linen bg-brand-surface/80 p-1 ${className}`.trim()}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-white text-brand-ink shadow-sm ring-1 ring-brand-linen/80'
                : 'text-brand-ink-muted hover:bg-white/70 hover:text-brand-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
