import { normalizeRoleName } from '@/core/api/normalizers';
import type { EmpresaPlanSummary, UserRole } from '@/core/interfaces';
import { isPlanModuleEnabled } from '@/core/config/plan-access';
import { isRubroModuleEnabled } from '@/core/config/rubro-packs';

export type NavSectionId = 'operate' | 'control' | 'configure';
export type NavClusterId = 'orders' | 'catalog' | 'business';

export type AppModule = {
  key: string;
  title: string;
  description: string;
  /** Clave de SVG en NavGlyph (20px), no emoji */
  icon: string;
  path: string;
  allowed: readonly UserRole[];
  /** Tarjeta en /dashboard */
  showOnDashboard?: boolean;
  /** Ítem de primer nivel en el menú lateral */
  showInNav?: boolean;
  navSection?: NavSectionId;
  /** Agrupa ítems bajo un acordeón (Pedidos, Catálogo, Negocio) */
  navCluster?: NavClusterId;
  /** Submenú Catálogo (productos, proveedores, categorías) */
  catalogGroup?: boolean;
};

export type RoleProfile = {
  role: UserRole;
  label: string;
  panelTitle: string;
  panelDescription: string;
  canSwitchBranch: boolean;
  canApproveShrinkages: boolean;
  /** Crear, editar, desactivar y restaurar usuarios */
  canManageUsers: boolean;
  /** Crear, editar, desactivar y restaurar sucursales */
  canManageBranches: boolean;
  /** Editar perfil comercial de la empresa (tenant) */
  canManageEmpresa: boolean;
};

const ALL_ROLES: readonly UserRole[] = ['admin', 'auditor', 'seller', 'comanda', 'delivery', 'user'];

/** Perfiles conocidos; roles nuevos en BD usan fallback dinámico. */
const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  admin: {
    role: 'admin',
    label: 'Administrador',
    panelTitle: 'Panel de administración',
    panelDescription:
      'Configuración del sistema, usuarios, sucursales, catálogo, ventas, mermas y reportes de todas las sucursales.',
    canSwitchBranch: true,
    canApproveShrinkages: true,
    canManageUsers: true,
    canManageBranches: true,
    canManageEmpresa: true,
  },
  auditor: {
    role: 'auditor',
    label: 'Auditor',
    panelTitle: 'Panel de auditoría',
    panelDescription:
      'Supervisión operativa: reportes, aprobación de mermas y consulta de usuarios y sucursales. Puedes cambiar la sucursal activa en el encabezado; no puedes desactivar locales ni usuarios.',
    canSwitchBranch: true,
    canApproveShrinkages: true,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  },
  seller: {
    role: 'seller',
    label: 'Vendedor',
    panelTitle: 'Panel de ventas',
    panelDescription:
      'Operación de caja y sucursal: registrar ventas, ver comandas y reportar mermas de tu sucursal asignada.',
    canSwitchBranch: false,
    canApproveShrinkages: false,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  },
  comanda: {
    role: 'comanda',
    label: 'Comanda',
    panelTitle: 'Panel de cocina',
    panelDescription:
      'Seguimiento de pedidos pendientes de preparación en tu sucursal. Las ventas del POS aparecen aquí en vivo.',
    canSwitchBranch: false,
    canApproveShrinkages: false,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  },
  delivery: {
    role: 'delivery',
    label: 'Repartidor',
    panelTitle: 'Panel de reparto',
    panelDescription:
      'Pedidos asignados a ti: marca en ruta y confirma entregas de tu sucursal.',
    canSwitchBranch: false,
    canApproveShrinkages: false,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  },
  user: {
    role: 'user',
    label: 'Usuario',
    panelTitle: 'Panel de usuario',
    panelDescription: 'Acceso limitado según permisos asignados.',
    canSwitchBranch: false,
    canApproveShrinkages: false,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  },
};

/**
 * Fuente única de módulos. Para un rol nuevo en BD, añade el rol en `allowed`
 * de cada módulo o extiende ROLE_PROFILES si necesita permisos especiales.
 */
export const APP_MODULES: readonly AppModule[] = [
  {
    key: 'dashboard',
    title: 'Hoy',
    description: 'Resumen operativo del día',
    icon: 'home',
    path: '/dashboard',
    allowed: ['admin', 'auditor', 'seller', 'comanda', 'delivery'],
    showInNav: true,
    navSection: 'operate',
  },
  {
    key: 'pos',
    title: 'Caja',
    description: 'Registrar ventas y carrito de compras',
    icon: 'register',
    path: '/pos',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'operate',
  },
  {
    key: 'pedidos',
    title: 'Pedidos',
    description: 'Cola digital: WhatsApp, pagos y envíos',
    icon: 'orders',
    path: '/pedidos',
    allowed: ['admin', 'auditor', 'seller'],
    showInNav: true,
    navSection: 'operate',
  },
  {
    key: 'catalog',
    title: 'Catálogo',
    description: 'Productos, proveedores y categorías',
    icon: 'catalog',
    path: '/products',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    catalogGroup: true,
  },
  {
    key: 'products',
    title: 'Productos',
    description: 'Inventario y precios por sucursal',
    icon: 'box',
    path: '/products',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
    navSection: 'configure',
    navCluster: 'catalog',
  },
  {
    key: 'suppliers',
    title: 'Proveedores',
    description: 'Gestión de proveedores',
    icon: 'truck',
    path: '/suppliers',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
    navSection: 'configure',
    navCluster: 'catalog',
  },
  {
    key: 'categories',
    title: 'Categorías',
    description: 'Clasificación de productos',
    icon: 'tag',
    path: '/categories',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
    navSection: 'configure',
    navCluster: 'catalog',
  },
  {
    key: 'comandas',
    title: 'Comandas',
    description: 'Pedidos para cocina en vivo',
    icon: 'kitchen',
    path: '/comandas',
    allowed: ['admin', 'auditor', 'seller', 'comanda'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'operate',
    navCluster: 'orders',
  },
  {
    key: 'delivery',
    title: 'Envíos',
    description: 'Seguimiento de pedidos con delivery',
    icon: 'truck',
    path: '/delivery',
    allowed: ['admin', 'auditor', 'seller', 'comanda', 'delivery'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'operate',
    navCluster: 'orders',
  },
  {
    key: 'wsp',
    title: 'WhatsApp',
    description: 'Menú virtual gastronómico con código QR por sucursal',
    icon: 'qr',
    path: '/wsp',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'operate',
    navCluster: 'orders',
  },
  {
    key: 'comprobantes',
    title: 'Pagos',
    description: 'Validar pagos por transferencia (WhatsApp)',
    icon: 'chat',
    path: '/comprobantes',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'operate',
    navCluster: 'orders',
  },
  {
    key: 'reportes',
    title: 'Reportes',
    description: 'Informes y estadísticas',
    icon: 'chart',
    path: '/reportes',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'control',
  },
  {
    key: 'manual',
    title: 'Ayuda',
    description: 'Manual operativo por rol',
    icon: 'help',
    path: '/manual',
    allowed: ALL_ROLES,
  },
  {
    key: 'users',
    title: 'Equipo',
    description: 'Roles, sucursales y accesos',
    icon: 'users',
    path: '/users',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'configure',
    navCluster: 'business',
  },
  {
    key: 'mermas',
    title: 'Mermas',
    description: 'Registro y aprobación de pérdidas',
    icon: 'waste',
    path: '/mermas',
    allowed: ['admin', 'auditor', 'seller'],
    showInNav: true,
    navSection: 'control',
  },
  {
    key: 'branches',
    title: 'Locales',
    description: 'Locales y puestos temporales',
    icon: 'store',
    path: '/branches',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'configure',
    navCluster: 'business',
  },
  {
    key: 'empresas',
    title: 'Empresa',
    description: 'Datos comerciales y facturación del tenant',
    icon: 'building',
    path: '/empresas',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'configure',
    navCluster: 'business',
  },
  {
    key: 'clientes',
    title: 'Clientes',
    description: 'Clientes mayoristas, cupo y mora',
    icon: 'users',
    path: '/clientes',
    allowed: ['admin', 'auditor', 'seller'],
    showInNav: true,
    navSection: 'configure',
    navCluster: 'business',
  },
] as const;

const NAV_SECTION_ORDER: readonly NavSectionId[] = ['operate', 'control', 'configure'];

const NAV_SECTION_LABELS: Record<NavSectionId, string> = {
  operate: 'Operar',
  control: 'Controlar',
  configure: 'Configurar',
};

const NAV_CLUSTER_META: Record<NavClusterId, { label: string; icon: string; section: NavSectionId }> = {
  orders: { label: 'Pedidos', icon: 'orders', section: 'operate' },
  catalog: { label: 'Catálogo', icon: 'catalog', section: 'configure' },
  business: { label: 'Negocio', icon: 'business', section: 'configure' },
};

export function resolveUserRole(role?: string): UserRole {
  return normalizeRoleName(role);
}

/** Perfil del rol; si el rol no está mapeado, genera etiquetas legibles. */
export function getRoleProfile(role?: string): RoleProfile {
  const resolved = resolveUserRole(role);
  const known = ROLE_PROFILES[resolved];
  if (known) return known;

  const raw = (role ?? 'user').trim();
  const label = raw
    ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    : 'Usuario';

  return {
    role: resolved,
    label,
    panelTitle: `Panel — ${label}`,
    panelDescription: 'Acceso según módulos habilitados para tu rol.',
    canSwitchBranch: false,
    canApproveShrinkages: false,
    canManageUsers: false,
    canManageBranches: false,
    canManageEmpresa: false,
  };
}

export function roleHasModuleAccess(role: UserRole | string, module: AppModule): boolean {
  const resolved = typeof role === 'string' ? resolveUserRole(role) : role;
  return module.allowed.includes(resolved);
}

function filterModulesForTenant(
  modules: AppModule[],
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): AppModule[] {
  return modules.filter(
    (m) => isPlanModuleEnabled(m.key, plan) && isRubroModuleEnabled(m.key, rubroNegocio)
  );
}

export function getDashboardModulesForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForTenant(
    APP_MODULES.filter((m) => m.showOnDashboard && roleHasModuleAccess(resolved, m)),
    plan,
    rubroNegocio
  );
}

export function getNavModulesForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForTenant(
    APP_MODULES.filter((m) => m.showInNav && roleHasModuleAccess(resolved, m)),
    plan,
    rubroNegocio
  );
}

export function getCatalogModulesForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForTenant(
    APP_MODULES.filter((m) => m.catalogGroup && roleHasModuleAccess(resolved, m)),
    plan,
    rubroNegocio
  );
}

export type NavCluster = {
  id: NavClusterId;
  label: string;
  icon: string;
  items: AppModule[];
};

export type NavSection = {
  id: NavSectionId;
  label: string;
  items: AppModule[];
  clusters: NavCluster[];
};

function modulesForCluster(
  clusterId: NavClusterId,
  role: UserRole,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): AppModule[] {
  return filterModulesForTenant(
    APP_MODULES.filter((m) => m.navCluster === clusterId && roleHasModuleAccess(role, m)),
    plan,
    rubroNegocio
  );
}

/** Menú lateral: Operar / Controlar / Configurar. Acordeones no cuentan como ítems extra. */
export function getNavSectionsForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): NavSection[] {
  const resolved = resolveUserRole(role);
  const topLevel = filterModulesForTenant(
    APP_MODULES.filter(
      (m) =>
        m.showInNav &&
        !m.navCluster &&
        !m.catalogGroup &&
        roleHasModuleAccess(resolved, m)
    ),
    plan,
    rubroNegocio
  );

  return NAV_SECTION_ORDER.map((id) => {
    const items = topLevel.filter((m) => m.navSection === id);
    const hideOrdersCluster = topLevel.some((m) => m.key === 'pedidos');
    const clusters: NavCluster[] = (Object.keys(NAV_CLUSTER_META) as NavClusterId[])
      .filter((clusterId) => NAV_CLUSTER_META[clusterId].section === id)
      .filter((clusterId) => !(hideOrdersCluster && clusterId === 'orders'))
      .map((clusterId) => {
        const clusterItems = modulesForCluster(clusterId, resolved, plan, rubroNegocio);
        if (clusterItems.length === 0) return null;
        if (clusterItems.length === 1) {
          return null;
        }
        return {
          id: clusterId,
          label: NAV_CLUSTER_META[clusterId].label,
          icon: NAV_CLUSTER_META[clusterId].icon,
          items: clusterItems,
        };
      })
      .filter((c): c is NavCluster => c !== null);

    const promoted = (Object.keys(NAV_CLUSTER_META) as NavClusterId[])
      .filter((clusterId) => NAV_CLUSTER_META[clusterId].section === id)
      .filter((clusterId) => !(hideOrdersCluster && clusterId === 'orders'))
      .flatMap((clusterId) => {
        const clusterItems = modulesForCluster(clusterId, resolved, plan, rubroNegocio);
        return clusterItems.length === 1 ? clusterItems : [];
      });

    const mergedItems = [...items, ...promoted];
    if (mergedItems.length === 0 && clusters.length === 0) return null;
    return {
      id,
      label: NAV_SECTION_LABELS[id],
      items: mergedItems,
      clusters,
    };
  }).filter((s): s is NavSection => s !== null);
}

/** Ítems visibles de primer nivel (secciones + acordeones, sin hijos). */
export function countTopLevelNavEntries(sections: NavSection[]): number {
  return sections.reduce((n, s) => n + s.items.length + s.clusters.length, 0);
}

export function getRoleLabel(role?: string): string {
  return getRoleProfile(role).label;
}

function findModulesForPath(pathname: string): AppModule[] {
  return APP_MODULES.filter(
    (m) => pathname === m.path || pathname.startsWith(`${m.path}/`)
  );
}

/** Control de rutas en RouteGuard; nuevos módulos en APP_MODULES quedan cubiertos automáticamente. */
export function canAccessPath(
  role: string | undefined,
  pathname: string,
  plan?: EmpresaPlanSummary | null,
  rubroNegocio?: string | null
): boolean {
  if (!role?.trim()) return false;

  const resolved = resolveUserRole(role);
  const matches = findModulesForPath(pathname);

  if (matches.length === 0) {
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      const dashboard = APP_MODULES.find((m) => m.key === 'dashboard');
      return dashboard ? roleHasModuleAccess(resolved, dashboard) : true;
    }
    return true;
  }

  const bestMatch = matches.reduce((best, current) =>
    current.path.length > best.path.length ? current : best
  );

  if (!roleHasModuleAccess(resolved, bestMatch)) return false;
  if (!isPlanModuleEnabled(bestMatch.key, plan)) return false;
  return isRubroModuleEnabled(bestMatch.key, rubroNegocio);
}
