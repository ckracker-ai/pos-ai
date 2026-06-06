import { normalizeSearchText } from '../../territory/utils/textNormalize';
import type { CategoryDto, CategoryTreeNode } from '../delegates/CategoryDelegate';

export function normalizeCatalogQuery(q: string): string {
  return normalizeSearchText(q);
}

/** IDs de categorías hoja bajo un nodo (o el propio nodo si ya es hoja). */
export function collectLeafCategoryIds(
  flat: CategoryDto[],
  rootId: string
): Set<string> {
  const childCount = new Map<string, number>();
  for (const c of flat) {
    if (!c.parentId) continue;
    childCount.set(c.parentId, (childCount.get(c.parentId) ?? 0) + 1);
  }

  const leaves = new Set(
    flat.filter((c) => c.isActive && (childCount.get(c.id) ?? 0) === 0).map((c) => c.id)
  );

  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    const directChildren = flat.filter((c) => c.parentId === id && c.isActive);
    if (directChildren.length === 0) {
      if (leaves.has(id)) out.add(id);
      continue;
    }
    for (const ch of directChildren) stack.push(ch.id);
  }
  return out;
}

/** Categorías cuyo nombre o slug coincide con la consulta (incluye padres). */
export function matchCategoryIdsByQuery(flat: CategoryDto[], query: string): Set<string> {
  const needle = normalizeCatalogQuery(query);
  if (!needle) return new Set();

  const matchedRoots = flat.filter((c) => {
    if (!c.isActive) return false;
    const slug = normalizeCatalogQuery(c.slug);
    const name = normalizeCatalogQuery(c.name);
    return slug.includes(needle) || name.includes(needle) || needle.includes(slug);
  });

  const productCategoryIds = new Set<string>();
  for (const cat of matchedRoots) {
    for (const leafId of collectLeafCategoryIds(flat, cat.id)) {
      productCategoryIds.add(leafId);
    }
  }
  return productCategoryIds;
}

export function formatCompactCategoryCatalog(tree: CategoryTreeNode[]): string {
  const lines: string[] = [];
  const walk = (nodes: CategoryTreeNode[], indent: number) => {
    for (const n of nodes) {
      if (!n.isActive) continue;
      const pad = '  '.repeat(indent);
      if (n.children?.length) {
        lines.push(`${pad}${n.name} (${n.slug})`);
        walk(n.children, indent + 1);
      } else {
        lines.push(`${pad}· ${n.name} [${n.slug}]`);
      }
    }
  };
  walk(tree, 0);
  return lines.join('\n');
}
