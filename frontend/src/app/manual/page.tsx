'use client';

import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { Navbar } from '@/components/organisms/Navbar';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { useAuthStore } from '@/store/auth';

type ManualRole = 'admin' | 'auditor' | 'seller' | 'comanda' | 'all';

type ManualSection = {
  id: string;
  title: string;
  hint: string;
  allowed: ManualRole[];
  bullets: string[];
};

const sections: ManualSection[] = [
  {
    id: 'inicio',
    title: 'Primer ingreso al sistema',
    hint: 'Checklist de arranque para cualquier usuario.',
    allowed: ['all'],
    bullets: [
      'Ingresa con tu correo y contraseña corporativa.',
      'Verifica tu nombre y rol en el menú de sesión (esquina superior derecha).',
      'Revisa la sucursal activa en la barra azul; ese contexto afecta consultas y operaciones.',
      'Usa esta misma página cuando cambie el proceso operativo.',
    ],
  },
  {
    id: 'ventas',
    title: 'POS y ventas',
    hint: 'Flujo operativo para caja y venta rápida.',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'Agrega productos al carrito desde el buscador o lista rápida.',
      'Confirma cantidades antes de cerrar la venta; el stock se descuenta automáticamente.',
      'Si falla por stock, revisa inventario de la sucursal activa.',
      'Las comandas quedan visibles en el módulo Cocina/Comandas.',
    ],
  },
  {
    id: 'comandas',
    title: 'Comandas de cocina',
    hint: 'Vista de pedidos para preparación.',
    allowed: ['admin', 'auditor', 'seller', 'comanda'],
    bullets: [
      'Entrar a Comandas para ver pedidos recientes de la sucursal.',
      'Validar productos y cantidades antes de marcar atención.',
      'Usar esta pantalla como tablero operativo en cocina.',
      'Si no aparecen ventas, revisar que la venta esté COMPLETED y en sucursal correcta.',
    ],
  },
  {
    id: 'mermas',
    title: 'Mermas y aprobación',
    hint: 'Control de pérdidas y auditoría.',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'SELLER: reporta merma con motivo claro y evidencia cuando corresponda.',
      'AUDITOR/ADMIN: aprueba o rechaza y deja comentario trazable.',
      'Toda merma impacta stock y debe justificarse operacionalmente.',
      'Revisar pendientes diariamente para evitar descuadres al cierre.',
    ],
  },
  {
    id: 'mantenedores',
    title: 'Catálogo, sucursales y usuarios',
    hint: 'Módulos de administración.',
    allowed: ['admin', 'auditor'],
    bullets: [
      'Usuarios: alta/baja, activación y asignación de rol.',
      'Catálogo: productos, categorías y proveedores oficiales.',
      'Sucursales: crear o ajustar datos base de operación.',
      'Evitar cambios masivos en horario punta; preferir ventanas controladas.',
    ],
  },
  {
    id: 'seguridad',
    title: 'Buenas prácticas de seguridad',
    hint: 'Obligatorio para todo perfil.',
    allowed: ['all'],
    bullets: [
      'No compartir usuarios ni contraseñas entre colaboradores.',
      'Cerrar sesión al terminar turno o al dejar el equipo sin supervisión.',
      'Reportar de inmediato accesos sospechosos o cambios no autorizados.',
      'No guardar credenciales en notas, chats o correos sin protección.',
    ],
  },
];

function roleLabel(role: string | undefined): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    auditor: 'Auditor',
    seller: 'Vendedor',
    comanda: 'Comanda',
    user: 'Usuario',
  };
  return labels[role ?? 'user'] ?? (role ?? 'Usuario');
}

export default function ManualPage() {
  const user = useAuthStore((s) => s.user);
  const currentRole = (user?.role ?? 'user') as ManualRole | 'user';
  const [selectedSectionId, setSelectedSectionId] = useState<string>('inicio');

  const visibleSections = useMemo(
    () =>
      sections.filter((section) =>
        section.allowed.includes('all') || section.allowed.includes(currentRole as ManualRole)
      ),
    [currentRole]
  );

  const selected =
    visibleSections.find((section) => section.id === selectedSectionId) ?? visibleSections[0];

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Centro de ayuda</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Manual operativo interactivo
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Perfil activo: <span className="font-semibold">{roleLabel(user?.role)}</span>. Solo ves
            secciones aplicables a tu rol.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Secciones
            </p>
            <div className="space-y-1">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected?.id === section.id
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            {selected ? (
              <>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.hint}</p>
                <ul className="mt-4 space-y-2">
                  {selected.bullets.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No hay secciones disponibles para este perfil.
              </p>
            )}
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}

