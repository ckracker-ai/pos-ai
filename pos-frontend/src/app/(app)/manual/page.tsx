'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { Navbar } from '@/components/organisms/Navbar';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { useAuthStore } from '@/store/auth';
import { APP_VERSION_LABEL } from '@/core/constants/version';

type ManualRole = 'admin' | 'auditor' | 'seller' | 'comanda' | 'all';

type ManualSection = {
  id: string;
  title: string;
  hint: string;
  allowed: ManualRole[];
  bullets: string[];
};

const DEFAULT_SECTION_BY_ROLE: Record<string, string> = {
  admin: 'rol-admin',
  auditor: 'rol-auditor',
  seller: 'rol-seller',
  comanda: 'comandas',
  user: 'inicio',
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
      'Revisa la sucursal activa en la barra superior; reportes, comandas y comprobantes WSP filtran por esa sucursal.',
      'Usa Ayuda (esta página) cuando cambie un proceso; el contenido se adapta a tu rol.',
    ],
  },
  {
    id: 'rol-admin',
    title: 'Tu rol: Administrador',
    hint: 'Responsabilidades y módulos principales del perfil ADMIN.',
    allowed: ['admin'],
    bullets: [
      'Configuras empresa, sucursales, usuarios, catálogo y datos de transferencia que ve el cliente por WhatsApp.',
      'Puedes cambiar de sucursal en el encabezado para operar o revisar cualquier local.',
      'Apruebas o rechazas mermas y validas comprobantes de pago WSP (Confirmar / Rechazar).',
      'Los pedidos por WhatsApp quedan PENDING hasta que confirmes el comprobante; entonces pasan a COMPLETED y aparecen en Comandas.',
      'Mantén actualizados banco, cuenta, titular y RUT en Empresa → pestaña Transferencia.',
    ],
  },
  {
    id: 'rol-auditor',
    title: 'Tu rol: Auditor',
    hint: 'Supervisión sin modificar configuración sensible.',
    allowed: ['auditor'],
    bullets: [
      'Consultas reportes, ventas, comandas y comprobantes WSP de la sucursal activa.',
      'Puedes cambiar sucursal en el encabezado para auditar otros locales.',
      'Apruebas o rechazas mermas; el formulario Empresa es solo lectura.',
      'En Comprobantes WSP puedes confirmar o rechazar pagos igual que un administrador.',
      'No gestionas altas de usuarios ni sucursales; escala cambios estructurales al administrador.',
    ],
  },
  {
    id: 'rol-seller',
    title: 'Tu rol: Vendedor',
    hint: 'Operación de caja y atención en tu sucursal asignada.',
    allowed: ['seller'],
    bullets: [
      'Tu sucursal viene fijada por el administrador; no puedes cambiarla en el encabezado.',
      'Registras ventas en Punto de Venta y revisas Comandas de tu local.',
      'Validas comprobantes WhatsApp cuando el cliente ya envió la transferencia.',
      'Reportas mermas con motivo claro; un auditor o admin las aprueba o rechaza.',
      'No accedes a Empresa, usuarios ni sucursales.',
    ],
  },
  {
    id: 'rol-comanda',
    title: 'Tu rol: Comanda (cocina)',
    hint: 'Tablero de preparación en tu sucursal.',
    allowed: ['comanda'],
    bullets: [
      'Entra a Comandas para ver pedidos listos para preparar.',
      'Solo ves ventas COMPLETED de tu sucursal; los pedidos WSP pendientes de pago aún no aparecen aquí.',
      'Si no ves un pedido que el cliente mencionó por chat, puede estar esperando confirmación de pago en caja/admin.',
      'Usa Ayuda → Comandas de cocina para más detalle del flujo.',
    ],
  },
  {
    id: 'ventas',
    title: 'Punto de venta (POS)',
    hint: 'Ventas en mostrador y stock.',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'Agrega productos al carrito desde el buscador o atajos del catálogo.',
      'Panel «POS IA»: escribe o dicta como en el mostrador (ej. agrega 2 café tradicional). Sugerencias con cantidad editable. Atajo F2.',
      'Opcional: activa «formulario clásico» si prefieres buscar producto manualmente.',
      'El asistente valida stock acumulado en el carrito antes de agregar más unidades.',
      'Confirma cantidades antes de cerrar; el stock se descuenta al completar la venta.',
      'Si falla por stock, revisa inventario de la sucursal activa o pide ajuste al administrador.',
      'Las ventas de mostrador completadas se reflejan de inmediato en Comandas.',
      'Los pedidos por WhatsApp reservan stock al crearse; se liberan si se cancelan o se rechaza el comprobante.',
    ],
  },
  {
    id: 'comprobantes-wsp',
    title: 'Comprobantes WhatsApp',
    hint: 'Validar transferencias enviadas por clientes (Plan Estándar con asistente WSP).',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'Menú: Comprobantes WSP. Lista los pagos pendientes de la sucursal activa.',
      'Flujo del cliente por chat: sucursales → buscar producto → pedido → confirmar → datos de transferencia → monto (ej. vale 5000) → foto del comprobante.',
      'Hasta que el cliente escribe confirmar, no debe enviar comprobante; si lo hace antes, el bot le pedirá confirmar el pedido.',
      'Un mismo pedido guarda una sola imagen en el servidor; si el cliente reenvía la foto, se reemplaza el comprobante anterior (los duplicados se eliminan al cargar la lista).',
      'Ver comprobante: abre la imagen. Confirmar pago: completa el pedido y notifica al cliente por WhatsApp.',
      'Rechazar: cancela el pedido, libera el stock reservado y notifica al cliente. Puedes dejar una nota interna.',
      'Etiquetas IA (revisar, destinatario ilegible, monto distinto): guían la revisión; la decisión final es humana.',
      'Si la IA no lee bien la imagen, el cliente puede escribir el monto antes de la foto; igual debes validar la captura.',
    ],
  },
  {
    id: 'comandas',
    title: 'Comandas de cocina',
    hint: 'Vista de pedidos para preparación.',
    allowed: ['admin', 'auditor', 'seller', 'comanda'],
    bullets: [
      'Entra a Comandas para ver pedidos recientes de la sucursal activa.',
      'Aparecen ventas en estado COMPLETED (POS y pedidos WSP ya confirmados en Comprobantes).',
      'Los pedidos WhatsApp en espera de pago o sin confirmar comprobante no se listan aquí.',
      'Usa esta pantalla como tablero operativo en cocina; valida productos y cantidades antes de preparar.',
      'Si falta un pedido, verifica sucursal en la barra superior y que el pago WSP esté confirmado.',
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    hint: 'Consultas e indicadores por sucursal.',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'Los datos respetan la sucursal seleccionada (admin y auditor pueden cambiarla).',
      'El vendedor solo ve reportes de su sucursal asignada.',
      'Útil para cuadre de caja, ventas del día y seguimiento operativo.',
      'Cruza con Comprobantes WSP si hay diferencias entre ventas completadas y transferencias pendientes.',
    ],
  },
  {
    id: 'mermas',
    title: 'Mermas y aprobación',
    hint: 'Control de pérdidas y auditoría.',
    allowed: ['admin', 'auditor', 'seller'],
    bullets: [
      'Vendedor: reporta merma con motivo claro; el stock queda pendiente hasta aprobación.',
      'Administrador / Auditor: aprueba o rechaza y deja comentario trazable.',
      'Toda merma aprobada impacta stock; debe justificarse operacionalmente.',
      'Revisa pendientes a diario para evitar descuadres al cierre.',
    ],
  },
  {
    id: 'empresa-transferencia',
    title: 'Empresa y datos de transferencia',
    hint: 'Configuración que el asistente WhatsApp muestra al cliente.',
    allowed: ['admin'],
    bullets: [
      'Menú Mantenedores → Empresa → pestaña Transferencia.',
      'Completa banco, tipo de cuenta, número, titular y RUT; el bot los envía tras confirmar pedido.',
      'Datos incorrectos generan comprobantes con destinatario incorrecto o revisión manual.',
      'El teléfono del canal WhatsApp y bindings se gestionan en Plataforma POS-AI (soporte o implementación).',
      'Evita cambios en horario punta; avisa al equipo si actualizas la cuenta bancaria.',
    ],
  },
  {
    id: 'mantenedores',
    title: 'Catálogo, sucursales y usuarios',
    hint: 'Módulos de administración (admin y consulta auditor).',
    allowed: ['admin', 'auditor'],
    bullets: [
      'Administrador: usuarios (alta, roles, sucursal, activar/desactivar, restablecer contraseña).',
      'Administrador: sucursales y catálogo (productos, categorías, proveedores).',
      'Auditor: consulta usuarios y catálogo; no desactiva registros ni edita empresa.',
      'Prefiere ventanas controladas para cambios masivos; evita horario punta.',
      'Para categorías con subniveles (Pizzas → Tradicionales, etc.) lee la sección «Categorías y productos».',
      'Para comuna y código postal de cada local, lee «Sucursales: comuna y código postal».',
    ],
  },
  {
    id: 'catalogo-categorias',
    title: 'Categorías y productos (árbol)',
    hint: 'Cómo organizar el menú para POS, reportes y WhatsApp.',
    allowed: ['admin', 'auditor'],
    bullets: [
      'El catálogo usa dos niveles: categoría principal (ej. Pizzas, Sushi) y subcategoría (ej. Pizzas Tradicionales, Rolls Tempura).',
      'Paso 1 — Crear categoría principal: nombre claro del rubro, sin padre. Ejemplos: Pizzas, Sushi, Comida Rápida, Bebidas y Líquidos.',
      'Paso 2 — Crear subcategoría: mismo mantenedor, eligiendo la categoría principal como padre. Ej.: bajo Pizzas → Pizzas Tradicionales, Pizzas Premium, Acompañamientos.',
      'Paso 3 — Crear producto: asigna siempre una subcategoría (hoja), no la categoría principal si ya tiene hijos. Ej.: producto «Pepperoni» → subcategoría «Pizzas Tradicionales».',
      'Árbol de referencia (demo Costa Azul / rubro gastronómico): Pizzas (Tradicionales, Premium, Acompañamientos); Sushi (Rolls palta, Rolls tempura, Sashimi); Comida Rápida (Hamburguesas vacuno, Chicken/Veggie); Bebidas (Analcohólicas 1.5L, aguas).',
      'Los nombres deben ser únicos por empresa; evita duplicar «Pizzas» en principal y en sub.',
      'Desactivar una categoría oculta sus productos en POS y en búsquedas del bot; no borres si hay ventas históricas.',
      'Extras y modificadores (toppings, papas, etc.) deben aplicarse solo a la familia correcta (hamburguesas ≠ pizzas); por eso el producto va en la subcategoría adecuada.',
      'WhatsApp: el cliente busca por nombre; un árbol ordenado mejora sugerencias («buscar rolls tempura»). Tras cambiar categorías, prueba buscar en el simulador.',
    ],
  },
  {
    id: 'sucursales-territorio',
    title: 'Sucursales: comuna y código postal',
    hint: 'Ubicación oficial (CUT Chile) para delivery, facturación y WhatsApp.',
    allowed: ['admin', 'auditor'],
    bullets: [
      'Cada sucursal física debe tener dirección, comuna (lista oficial Chile / CUT) y código postal de 7 dígitos (CorreosChile).',
      'Paso 1 — En Sucursales, elige Región y luego Comuna en el selector (no escribas la comuna a mano en un campo libre).',
      'Paso 2 — Ingresa la dirección (calle y número) y el código postal de 7 dígitos de esa dirección.',
      'Ejemplo: Región Metropolitana → Comuna Estación Central → dirección «Av. Ecuador 123» → CP «9160000» (valor ilustrativo; usa el CP real de tu local).',
      'El sistema no consulta internet en cada pedido: las comunas vienen cargadas desde el estándar CUT (SUBDERE) en la base de datos.',
      'WhatsApp / voz: el cliente puede decir su comuna; el bot busca coincidencias aunque falten tildes («estacion central»). Si hay varias, pedirá que elija por número.',
      'Delivery y despacho usan comuna + CP para zonificar; datos incorrectos envían pedidos a la sucursal equivocada.',
      'Al abrir un local nuevo, completa comuna y CP antes de activar pedidos por chat.',
    ],
  },
  {
    id: 'seguridad',
    title: 'Buenas prácticas de seguridad',
    hint: 'Obligatorio para todo perfil.',
    allowed: ['all'],
    bullets: [
      'No compartas usuario ni contraseña entre colaboradores.',
      'Cierra sesión al terminar turno o al dejar el equipo sin supervisión.',
      'Reporta de inmediato accesos sospechosos o cambios no autorizados.',
      'No guardes credenciales en chats públicos ni captures pantallas con datos de clientes.',
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
  const [roleDefaultApplied, setRoleDefaultApplied] = useState(false);

  const visibleSections = useMemo(
    () =>
      sections.filter((section) =>
        section.allowed.includes('all') || section.allowed.includes(currentRole as ManualRole)
      ),
    [currentRole]
  );

  useEffect(() => {
    if (roleDefaultApplied || currentRole === 'user') return;
    const defaultId = DEFAULT_SECTION_BY_ROLE[currentRole];
    if (defaultId && visibleSections.some((s) => s.id === defaultId)) {
      setSelectedSectionId(defaultId);
    }
    setRoleDefaultApplied(true);
  }, [currentRole, visibleSections, roleDefaultApplied]);

  useEffect(() => {
    if (!visibleSections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(visibleSections[0]?.id ?? 'inicio');
    }
  }, [visibleSections, selectedSectionId]);

  const selected =
    visibleSections.find((section) => section.id === selectedSectionId) ?? visibleSections[0];

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="app-card mb-6 rounded-3xl p-6">
          <AppPageHeader
            kicker="Centro de ayuda"
            title="Manual operativo por rol"
            description={
              <>
                Perfil activo: <span className="font-semibold text-brand-ink">{roleLabel(user?.role)}</span>.
                Solo ves secciones aplicables a tu rol. Versión: {APP_VERSION_LABEL}.
              </>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <aside className="app-card rounded-3xl p-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink-muted">
              Secciones ({visibleSections.length})
            </p>
            <div className="space-y-1">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected?.id === section.id
                      ? 'bg-[rgba(74,83,60,0.12)] font-medium text-[#3D4532]'
                      : 'text-brand-ink-muted hover:bg-brand-surface/80'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </aside>

          <section className="app-card rounded-3xl p-6 lg:col-span-2">
            {selected ? (
              <>
                <h2 className="text-xl font-semibold text-[#3D4532]">
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm text-brand-ink-muted">{selected.hint}</p>
                <ul className="mt-4 space-y-2">
                  {selected.bullets.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-[rgba(209,199,189,0.75)] bg-brand-surface/50 px-3 py-2 text-sm text-brand-ink"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-brand-ink-muted">
                No hay secciones disponibles para este perfil.
              </p>
            )}
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
