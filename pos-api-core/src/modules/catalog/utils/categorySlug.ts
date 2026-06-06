import { normalizeSearchText } from '../../territory/utils/textNormalize';

/** Slug URL/voz: minúsculas, sin tildes, guiones. */
export function slugFromCategoryName(name: string): string {
  const base = normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (base || 'categoria').slice(0, 120);
}
