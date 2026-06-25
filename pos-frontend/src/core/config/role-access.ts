import { normalizeRoleName } from '@/core/api/normalizers';
import type { EmpresaPlanSummary, UserRole } from '@/core/interfaces';
import { isPlanModuleEnabled } from '@/core/config/plan-access';

export type NavSectionId = 'navigation' | 'maintainers';

export type AppModule = {
  key: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  allowed: readonly UserRole[];
  /** Tarjeta en /dashboard */
  showOnDashboard?: boolean;
  /** Ítem en menú lateral */
  showInNav?: boolean;
  navSection?: NavSectionId;
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
    title: 'Dashboard',
    description: 'Resumen y accesos rápidos de tu rol',
    icon: '🏠',
    path: '/dashboard',
    allowed: ['admin', 'auditor', 'seller', 'comanda', 'delivery'],
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'pos',
    title: 'Punto de Venta',
    description: 'Registrar ventas y carrito de compras',
    icon: '🛒',
    path: '/pos',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'catalog',
    title: 'Catálogo',
    description: 'Productos, proveedores y categorías',
    icon: '📚',
    path: '/products',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'maintainers',
    catalogGroup: true,
  },
  {
    key: 'products',
    title: 'Productos',
    description: 'Inventario y precios por sucursal',
    icon: '📦',
    path: '/products',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
  },
  {
    key: 'suppliers',
    title: 'Proveedores',
    description: 'Gestión de proveedores',
    icon: '🚚',
    path: '/suppliers',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
  },
  {
    key: 'categories',
    title: 'Categorías',
    description: 'Clasificación de productos',
    icon: '🏷️',
    path: '/categories',
    allowed: ['admin', 'auditor'],
    catalogGroup: true,
  },
  {
    key: 'comandas',
    title: 'Comandas',
    description: 'Pedidos para cocina en vivo',
    icon: '👨‍🍳',
    path: '/comandas',
    allowed: ['admin', 'auditor', 'seller', 'comanda'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'delivery',
    title: 'Envíos',
    description: 'Seguimiento de pedidos con delivery',
    icon: '📦',
    path: '/delivery',
    allowed: ['admin', 'auditor', 'seller', 'comanda', 'delivery'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'wsp',
    title: 'WhatsApp y menú QR',
    description: 'Menú virtual gastronómico con código QR por sucursal',
    icon: '📱',
    path: '/wsp',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'comprobantes',
    title: 'Comprobantes WSP',
    description: 'Validar pagos por transferencia (WhatsApp)',
    icon: '💬',
    path: '/comprobantes',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'reportes',
    title: 'Reportes',
    description: 'Informes y estadísticas',
    icon: '📈',
    path: '/reportes',
    allowed: ['admin', 'auditor', 'seller'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'manual',
    title: 'Ayuda',
    description: 'Manual operativo por rol',
    icon: '❓',
    path: '/manual',
    allowed: ALL_ROLES,
    showInNav: true,
    navSection: 'navigation',
  },
  {
    key: 'users',
    title: 'Gestión de usuarios',
    description: 'Roles, sucursales y accesos',
    icon: '👥',
    path: '/users',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'maintainers',
  },
  {
    key: 'mermas',
    title: 'Mermas',
    description: 'Registro y aprobación de pérdidas',
    icon: '🧾',
    path: '/mermas',
    allowed: ['admin', 'auditor', 'seller'],
    showInNav: true,
    navSection: 'maintainers',
  },
  {
    key: 'branches',
    title: 'Sucursales',
    description: 'Locales y puestos temporales',
    icon: '🏪',
    path: '/branches',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'maintainers',
  },
  {
    key: 'empresas',
    title: 'Empresa',
    description: 'Datos comerciales y facturación del tenant',
    icon: '🏢',
    path: '/empresas',
    allowed: ['admin', 'auditor'],
    showOnDashboard: true,
    showInNav: true,
    navSection: 'maintainers',
  },
] as const;

const NAV_SECTION_LABELS: Record<NavSectionId, string> = {
  navigation: 'Navegación',
  maintainers: 'Mantenedores',
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

function filterModulesForPlan(modules: AppModule[], plan?: EmpresaPlanSummary | null): AppModule[] {
  return modules.filter((m) => isPlanModuleEnabled(m.key, plan));
}

export function getDashboardModulesForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null
): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForPlan(
    APP_MODULES.filter((m) => m.showOnDashboard && roleHasModuleAccess(resolved, m)),
    plan
  );
}

export function getNavModulesForRole(role?: string, plan?: EmpresaPlanSummary | null): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForPlan(
    APP_MODULES.filter((m) => m.showInNav && roleHasModuleAccess(resolved, m)),
    plan
  );
}

export function getCatalogModulesForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null
): AppModule[] {
  const resolved = resolveUserRole(role);
  return filterModulesForPlan(
    APP_MODULES.filter((m) => m.catalogGroup && roleHasModuleAccess(resolved, m)),
    plan
  );
}

export type NavSection = {
  id: NavSectionId;
  label: string;
  items: AppModule[];
  catalogItems: AppModule[];
};

/** Menú lateral agrupado por sección. */
export function getNavSectionsForRole(
  role?: string,
  plan?: EmpresaPlanSummary | null
): NavSection[] {
  const resolved = resolveUserRole(role);
  const navModules = getNavModulesForRole(resolved, plan).filter((m) => !m.catalogGroup);
  const catalogItems = getCatalogModulesForRole(resolved, plan);

  return (['navigation', 'maintainers'] as NavSectionId[])
    .map((id) => {
      const items = navModules.filter((m) => m.navSection === id && !m.catalogGroup);
      const showCatalog = id === 'maintainers' && catalogItems.length > 0;
      if (items.length === 0 && !showCatalog) return null;
      return {
        id,
        label: NAV_SECTION_LABELS[id],
        items,
        catalogItems: showCatalog ? catalogItems : [],
      };
    })
    .filter((s): s is NavSection => s !== null);
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
  plan?: EmpresaPlanSummary | null
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
  return isPlanModuleEnabled(bestMatch.key, plan);
}
