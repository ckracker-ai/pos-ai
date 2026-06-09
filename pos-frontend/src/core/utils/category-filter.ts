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

/** Ruta legible por categoría (ej. «Hamburguesas › Carne») para POS IA y etiquetas. */
export function buildCategoryLabelMap(tree: CategoryTreeNode[]): Map<string, string> {
  const map = new Map<string, string>();

  const walk = (nodes: CategoryTreeNode[], ancestors: string[]) => {
    for (const node of nodes) {
      if (!node.isActive) continue;
      const path = [...ancestors, node.name];
      map.set(node.id, path.length > 1 ? path.join(' › ') : node.name);
      if (node.children?.length) walk(node.children, path);
    }
  };

  walk(tree, []);
  return map;
}

export function categoryDisplayShort(label: string | undefined): string {
  const raw = label?.trim() ?? '';
  if (!raw) return '';
  const parts = raw.split('›').map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : raw;
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
