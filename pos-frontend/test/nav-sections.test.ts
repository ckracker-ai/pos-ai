import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessPath,
  countTopLevelNavEntries,
  getNavSectionsForRole,
} from '../src/core/config/role-access.ts';
import type { EmpresaPlanSummary } from '../src/core/interfaces/index.ts';

const fullPlan: EmpresaPlanSummary = {
  id: 'plan-full',
  codigo: 'FULL',
  nombre: 'Full',
  descripcion: null,
  valor: 0,
  metodoPago: 'TRANSFERENCIA',
  activo: true,
  maxSucursales: 10,
  maxUsuarios: 20,
  features: {
    modulosCore: true,
    assistantWhatsapp: true,
    assistantVoz: true,
    pagosOnline: true,
  },
};

test('admin Full: Operar/Controlar/Configurar y máx. 7 ítems de primer nivel', () => {
  const sections = getNavSectionsForRole('admin', fullPlan);
  assert.deepEqual(
    sections.map((s) => s.id),
    ['operate', 'control', 'configure']
  );
  assert.equal(sections[0].label, 'Operar');
  assert.equal(countTopLevelNavEntries(sections), 7);
  const operateLabels = [
    ...sections[0].items.map((i) => i.title),
    ...sections[0].clusters.map((c) => c.label),
  ];
  assert.ok(operateLabels.includes('Hoy'));
  assert.ok(operateLabels.includes('Caja'));
  assert.ok(operateLabels.includes('Pedidos'));
  assert.ok(sections[0].items.some((i) => i.key === 'pedidos'));
  assert.ok(!sections[0].clusters.some((c) => c.id === 'orders'));
  assert.ok(sections[2].clusters.some((c) => c.id === 'catalog'));
  assert.ok(sections[2].clusters.some((c) => c.id === 'business'));
  assert.ok(!sections.some((s) => s.items.some((i) => i.key === 'manual')));
});

test('repartidor: Envíos queda al primer nivel (un solo ítem en Pedidos)', () => {
  const sections = getNavSectionsForRole('delivery', fullPlan);
  const operate = sections.find((s) => s.id === 'operate');
  assert.ok(operate);
  assert.equal(operate.clusters.length, 0);
  assert.ok(operate.items.some((i) => i.key === 'delivery'));
  assert.ok(countTopLevelNavEntries(sections) <= 7);
});

test('admin minimarket bloquea /comandas y conserva caja y envíos', () => {
  assert.equal(canAccessPath('admin', '/comandas', fullPlan, 'MINIMARKET'), false);
  assert.equal(canAccessPath('admin', '/pos', fullPlan, 'MINIMARKET'), true);
  assert.equal(canAccessPath('admin', '/delivery', fullPlan, 'MINIMARKET'), true);
  assert.equal(canAccessPath('admin', '/comandas', fullPlan, 'GASTRONOMIA'), true);
});

test('admin ferretería bloquea cocina y envíos', () => {
  assert.equal(canAccessPath('admin', '/comandas', fullPlan, 'FERRETERIA'), false);
  assert.equal(canAccessPath('admin', '/delivery', fullPlan, 'FERRETERIA'), false);
});
