/**
 * TDD — Catálogo jerárquico S1 (slug, árbol, búsqueda por familia).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import categoryDelegate, { type CategoryDto } from '../src/modules/catalog/delegates/CategoryDelegate.js';
import { slugFromCategoryName } from '../src/modules/catalog/utils/categorySlug.js';
import {
  collectLeafCategoryIds,
  formatCompactCategoryCatalog,
  matchCategoryIdsByQuery,
} from '../src/modules/catalog/utils/categorySearch.js';

test('slugFromCategoryName normaliza tildes y espacios', () => {
  assert.equal(slugFromCategoryName('Pizzas Premium'), 'pizzas-premium');
  assert.equal(slugFromCategoryName('  Empanadas  '), 'empanadas');
});

test('buildTree arma principal y subcategorías', () => {
  const flat: CategoryDto[] = [
    {
      id: 'r1',
      empresaId: 'e1',
      name: 'Empanadas',
      slug: 'empanadas',
      description: null,
      parentId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 's1',
      empresaId: 'e1',
      name: 'Pino',
      slug: 'pino',
      description: null,
      parentId: 'r1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const tree = categoryDelegate.buildTree(flat, true);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].slug, 'empanadas');
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].slug, 'pino');
});

test('matchCategoryIdsByQuery incluye hojas bajo familia', () => {
  const flat: CategoryDto[] = [
    {
      id: 'r1',
      empresaId: 'e1',
      name: 'Bebidas',
      slug: 'bebidas',
      description: null,
      parentId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 's1',
      empresaId: 'e1',
      name: 'Café',
      slug: 'cafe',
      description: null,
      parentId: 'r1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const ids = matchCategoryIdsByQuery(flat, 'bebidas');
  assert.ok(ids.has('s1'));
  assert.equal(collectLeafCategoryIds(flat, 'r1').has('s1'), true);
});

test('formatCompactCategoryCatalog lista familias sin UUID', () => {
  const tree = categoryDelegate.buildTree(
    [
      {
        id: 'r1',
        empresaId: 'e1',
        name: 'Pizzas',
        slug: 'pizzas',
        description: null,
        parentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's1',
        empresaId: 'e1',
        name: 'Tradicionales',
        slug: 'pizzas-tradicionales',
        description: null,
        parentId: 'r1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    true
  );
  const text = formatCompactCategoryCatalog(tree);
  assert.match(text, /Pizzas \(pizzas\)/);
  assert.match(text, /Tradicionales \[pizzas-tradicionales\]/);
  assert.doesNotMatch(text, /[0-9a-f]{8}-[0-9a-f]{4}/i);
});
