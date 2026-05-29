'use client';

import { useAuthStore } from '@/store/auth';
import { api } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    seller: 'Vendedor',
    auditor: 'Auditor',
    comanda: 'Comanda',
    user: 'Usuario',
  };

  return labels[role] || role;
};

const cards = [
  {
    title: 'Punto de Venta',
    description: 'Gestiona ventas y carrito de compras',
    icon: '🛒',
    path: '/pos',
    allowed: ['admin', 'auditor', 'seller'],
  },
  {
    title: 'Catálogo',
    description: 'Productos, proveedores y categorías',
    icon: '📚',
    path: '/products',
    allowed: ['admin', 'auditor'],
  },
  {
    title: 'Comandas',
    description: 'Pedidos para cocina en vivo',
    icon: '👨‍🍳',
    path: '/comandas',
    allowed: ['admin', 'auditor', 'seller', 'comanda'],
  },
  {
    title: 'Gestión de Usuarios',
    description: 'Roles y permisos',
    icon: '👥',
    path: '/users',
    allowed: ['admin', 'auditor'],
  },
  {
    title: 'Sucursales',
    description: 'Gestión de locales',
    icon: '🏪',
    path: '/branches',
    allowed: ['admin', 'auditor'],
  },
  {
    title: 'Reportes',
    description: 'Informes y estadísticas',
    icon: '📈',
    path: '/reportes',
    allowed: ['admin', 'auditor', 'seller'],
  },
];

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeBranchName, branchId, canSwitchBranch } = useActiveBranch();
  const [pendingShrinkagesCount, setPendingShrinkagesCount] = useState(0);

  const canApproveShrinkages = user?.role === 'admin' || user?.role === 'auditor';

  useEffect(() => {
    if (!canApproveShrinkages) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.getShrinkageByStatus('PENDING');
        const envelopeData = unwrapApiEnvelope(res.data) as { shrinkages?: unknown[] };
        const list = Array.isArray(envelopeData?.shrinkages) ? envelopeData.shrinkages : [];
        if (!cancelled) setPendingShrinkagesCount(list.length);
      } catch {
        if (!cancelled) setPendingShrinkagesCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canApproveShrinkages, branchId]);

  const visibleCards = cards.filter((card) =>
    card.allowed.includes(user?.role || 'user')
  );

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bienvenido, {user?.name || 'Usuario'}
          </h2>

          {canApproveShrinkages && (
            <button
              type="button"
              onClick={() => router.push('/mermas')}
              className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Mermas pendientes por autorizar"
              title="Mermas pendientes por autorizar"
            >
              <span className="mr-2">🧾</span>
              Pendientes
              {pendingShrinkagesCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-semibold text-white">
                  {pendingShrinkagesCount}
                </span>
              )}
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Tu rol: <span className="font-semibold">{getRoleLabel(user?.role || 'user')}</span>
          {' · '}
          Datos de: <span className="font-semibold">{activeBranchName}</span>
          {canSwitchBranch && (
            <span className="text-gray-500 dark:text-gray-500">
              {' '}
              (cambia la sucursal arriba para ver otra)
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCards.map((card) => (
          <button
            key={card.title}
            onClick={() => router.push(card.path)}
            className="text-left bg-white dark:bg-slate-900 rounded-lg shadow p-6 hover:shadow-lg transition border border-gray-200 dark:border-slate-800"
          >
            <div className="text-4xl mb-3">{card.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {card.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {card.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ Información de acceso
        </h3>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Los módulos visibles cambian según tu rol. Productos, inventario, POS, comandas, mermas y
          reportes muestran solo la sucursal seleccionada en el encabezado. Categorías y proveedores
          son catálogo global compartido.
        </p>
      </div>
    </main>
  );
}
