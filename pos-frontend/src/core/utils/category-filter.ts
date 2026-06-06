import type { CategoryTreeNode } from '@/core/api/normalizers';

export type PrincipalCategoryOption = { id: string; name: string };

/** Raíces del árbol + mapa hoja/subcategoría → categoría principal. */
export function buildCategoryFilterMaps(tree: CategoryTreeNode[]) {
  const principals: PrincipalCategoryOption[] = [];
  const leafToPrincipal = new Map<string, string>();

  for (const root of tree) {
    if (!root.isActive) continue;
    principals.push({ id: root.id, name: root.name });

    const children = root.children ?? [];
    if (children.length === 0) {
      leafToPrincipal.set(root.id, root.id);
      continue;
    }

    for (const child of children) {
      if (!child.isActive) continue;
      const subChildren = child.children ?? [];
      if (subChildren.length === 0) {
        leafToPrincipal.set(child.id, root.id);
      } else {
        for (const leaf of subChildren) {
          if (leaf.isActive) leafToPrincipal.set(leaf.id, root.id);
        }
      }
    }
  }

  return { principals, leafToPrincipal };
}

export function productMatchesPrincipalCategory(
  categoryId: string | undefined,
  principalFilter: string,
  leafToPrincipal: Map<string, string>
): boolean {
  if (!principalFilter || principalFilter === 'all') return true;
  if (!categoryId) return false;
  if (categoryId === principalFilter) return true;
  return leafToPrincipal.get(categoryId) === principalFilter;
}
