import { matchesStatusFilter, StatusFilterValue } from '@/components/molecules/StatusFilterSelect';

export const SOFT_DELETE_UNDO_MS = 8000;

export function filterByStatusAndSearch<T extends { isActive: boolean }>(
  items: T[],
  statusFilter: StatusFilterValue,
  searchTerm: string,
  searchFn: (item: T, query: string) => boolean
): T[] {
  const q = searchTerm.trim().toLowerCase();
  return items.filter((item) => {
    if (!matchesStatusFilter(item.isActive, statusFilter)) return false;
    if (!q) return true;
    return searchFn(item, q);
  });
}
