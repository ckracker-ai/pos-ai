import Fuse from 'fuse.js';

// Utility for fuzzy search
export type FuseSearchOptions = {
  threshold?: number;
  includeScore?: boolean;
  // Fuse.js accepts many more options; we keep this permissive but typed to avoid `any`.
  // Consumers can still pass through Fuse-compatible options via object spread.
  [key: string]: unknown;
};

export function createFuzzySearcher<T>(
  items: T[],
  options: FuseSearchOptions = {}
) {
  return new Fuse(items, {
    threshold: 0.6,
    includeScore: true,
    ...(options as Record<string, unknown>),
  });
}

export function fuzzySearch<T>(
  searchTerm: string,
  items: T[],
  options: FuseSearchOptions = {}
) {
  const fuse = createFuzzySearcher(items, options);
  return fuse.search(searchTerm);
}


// Date formatting
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Currency formatting
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(value);
}

// Number formatting
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function parseNumber(value: string): number {
  return parseFloat(value.replace(/,/g, '.'));
}
