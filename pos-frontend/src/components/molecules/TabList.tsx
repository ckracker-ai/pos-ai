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
      className={`flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800/80 ${className}`.trim()}
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
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
